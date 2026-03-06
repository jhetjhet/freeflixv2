const Busboy = require('busboy');
const Chunk = require('../database/models/Chunk');
const Path = require('path');
const fs = require('fs');
const axios = require('axios');

const CONTENT_RANGE_RE = /bytes\s+(?<start>\d+)-(?<end>\d+)\/(?<total>\d+)/;

const ALLOWED_EXTENSIONS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'ogv'];

function ChunkUpload(saveto, maxChunksize = 10485760) {
    this.saveto = saveto;
    this.maxChunksize = maxChunksize;

    /*
    ============================
    CONTENT RANGE VALIDATION
    ============================
    */
    this.contentRangeMiddleWare = (req, res, next) => {

        const header = req.get('content-range');

        if (!header)
            return res.status(400).send("Missing content-range header.");

        const match = header.match(CONTENT_RANGE_RE);

        if (!match)
            return res.status(400).send("Invalid content-range header.");

        const start = parseInt(match.groups.start);
        const end = parseInt(match.groups.end);
        const total = parseInt(match.groups.total);

        const chunkSize = end - start + 1;

        if (chunkSize > this.maxChunksize) {
            return res.status(400).send("Chunk exceeds maximum allowed size.");
        }

        req.contentRange = { start, end, total };

        next();
    };

    /*
    ============================
    BUSBOY PARSER
    ============================
    */
    this.busboyMiddleWare = (req, res, next) => {
        const busboy = new Busboy({
            headers: req.headers,
            limits: {
                files: 1,
                fileSize: this.maxChunksize
            }
        });

        const chunkid = req.params.chunkid;

        Chunk.findOrCreate({
            where: { id: chunkid },
            defaults: {
                id: chunkid,
                totalSize: req.contentRange.total
            }
        })
            .then(([chunk]) => {
                let fields = {};
                let writePromise;

                req.pipe(busboy);

                /*
                FIELD PARSER
                */
                busboy.on('field', (name, val) => {
                    fields[name] = val;
                });

                /*
                FILE CHUNK HANDLER
                */
                busboy.on('file', (fieldname, file) => {
                    if (fieldname !== 'chunk') {
                        file.resume();
                        return res.status(400).send("Expected field 'chunk'.");
                    }

                    if (!chunk.path) {
                        chunk.path = Path.join(this.saveto, `${chunkid}`);
                        chunk.save();
                    }

                    const filePath = chunk.path;
                    const { start } = req.contentRange;

                    /*
                    CREATE FILE IF FIRST CHUNK
                    */
                    if (!fs.existsSync(filePath)) {
                        const fd = fs.openSync(filePath, 'w');
                        fs.closeSync(fd);
                    }

                    /*
                    WRITE CHUNK AT OFFSET
                    */
                    const fileStream = fs.createWriteStream(filePath, {
                        flags: 'r+',
                        start: start
                    });

                    file.pipe(fileStream);

                    writePromise = new Promise((resolve, reject) => {
                        fileStream.on('finish', resolve);
                        fileStream.on('error', reject);
                        file.on('error', reject);
                    });
                });

                /*
                BUSBOY FINISHED PARSING
                */
                busboy.on('finish', async () => {
                    try {
                        if (writePromise)
                            await writePromise;

                        if (!fields.filename)
                            return res.status(400).json({
                                filename: "filename field required."
                            });

                        req.fields = fields;

                        await chunk.updateStats();

                        req.chunk = chunk;
                        req._saveto = this.saveto;

                        next();
                    } catch (err) {
                        console.error("Chunk write error:", err);

                        res.status(500).send("Chunk write failed");
                    }
                });
            })
            .catch(() => {
                res.status(404).send("Chunk record not found.");
            });
    };

    this.middlewares = [
        this.contentRangeMiddleWare,
        this.busboyMiddleWare
    ];
}
/*
============================
CONTINUE UPLOAD (RESUME)
============================
*/
ChunkUpload.prototype.continue = function () {
    return [async function (req, res) {
        try {
            const chunk = await Chunk.findByPk(req.params.chunkid);

            await chunk.updateStats();

            res.json({
                uploaded: chunk.uploaded
            });
        } catch {
            res.status(404).end();
        }
    }];
};
/*
============================
UPLOAD CHUNK
============================
*/
ChunkUpload.prototype.upload = function () {
    return [...this.middlewares];
};
/*
============================
COMPLETE UPLOAD
============================
*/
ChunkUpload.prototype.complete = function () {
    return [
        ...this.middlewares,
        async function (req, res, next) {
            try {
                let tmdb_id = req.fields.tmdb_id;
                let seasonNumber = req.fields.season_number;
                let episodeNumber = req.fields.episode_number;

                let finishedFilePath = req.chunk.path;

                let ext = Path.extname(req.fields.filename || '')
                    .replace('.', '')
                    .toLowerCase();

                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                    console.log("Extension not allowed:", ext);
                    return next();
                }

                let baseApi = `${process.env.DJANGO_URL_PATH}/api`;
                let requestUrl = '';

                if (seasonNumber && episodeNumber) {
                    requestUrl =
                        `${baseApi}/series/${tmdb_id}/season/${seasonNumber}/episode/${episodeNumber}/`;
                } else {
                    requestUrl =
                        `${baseApi}/movie/${tmdb_id}/`;
                }

                const response = await axios.get(requestUrl);

                const flixPath = response.data.video_path;

                let newFilePath = Path.join(
                    req._saveto,
                    `${flixPath}.${ext}`
                );

                let targetDir = Path.dirname(newFilePath);

                await fs.promises.mkdir(targetDir, { recursive: true });

                await fs.promises.rename(
                    finishedFilePath,
                    newFilePath
                );

                console.log("Upload completed:", newFilePath);

                await req.chunk.destroy();

                next();
            } catch (err) {
                console.error("Upload completion error:", err);

                res.status(500).end();
            }
        }
    ];
};
/*
============================
CANCEL UPLOAD
============================
*/
ChunkUpload.prototype.cancel = function () {
    return [
        async function (req, res) {
            try {
                const chunk = await Chunk.findByPk(req.params.chunkid);

                await fs.promises.unlink(chunk.path);

                await chunk.destroy();

                res.status(200).end();
            } catch {
                res.status(404).end();
            }
        }
    ];
};


module.exports = ChunkUpload;