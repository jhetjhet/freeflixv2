const Busboy = require('busboy');
const Chunk = require('../database/models/Chunk');
const Path = require('path');
const fs = require('fs');
const axios = require('axios');

const CONTENT_RANGE_RE = 'bytes\\s+(?<start>\\d+)-(?<end>\\d+)/(?<total>\\d+)';
const ALLOWED_EXTENSIONS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'ogv'];

function ChunkUpload(saveto, maxChunksize = 10485760) {
    this.saveto = saveto;
    this.maxChunksize = maxChunksize;

    this.contentRangeMiddleWare = function(req, res, next){
        const contentRange = req.get('content-range');
        if(!contentRange) 
            return res.status(400).send("No content-range found in the header.");
        const m = contentRange.match(CONTENT_RANGE_RE);

        if(!m)
            return res.status(400).send("Invalid content-range header.");

        const start = parseInt(m.groups.start);
        const end = parseInt(m.groups.end);
        const total = parseInt(m.groups.total);

        if((total - end) > this.maxChunksize) {
            return res.status(400).send("content-range reached its maximum limit.");
        }

        req.contentRange = {start, end, total};
        
        next();
    }

    this.busboyMiddleWare = function(req, res, next){
        const busboy = new Busboy({
            headers: req.headers,
            limits: {
                files: 1,
                fileSize: this.maxChunksize,
            }
        });
        const chunkid = req.params.chunkid;

        Chunk.findOrCreate({
            where: {id: chunkid},
            defaults: {
                id: chunkid,
                totalSize: req.contentRange.total,
            }
        }).then(([chunk]) => {
            var fields = {};
            req.pipe(busboy);
        
            busboy.on('field', (fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) => {
                fields[fieldname] = val;
            });
        
            busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

                if (!chunk.path) {
                    chunk.path = Path.join(saveto, `${chunkid}`);
                    chunk.save();
                    chunk.updateStats();
                }

                const writeMode = chunk?.stats ? 'a' : 'w';
                const filePath = chunk.path || '';
                
                if (!filePath) {
                    file.resume();
                    return res.status(400).send("File path is not set.");
                }

                if (fieldname !== 'chunk') {
                    file.resume();
                    return res.status(400).send("Invalid field name, expected 'chunk'.");
                }

                const fileStream = fs.createWriteStream(filePath, { flags: writeMode });
                file.pipe(fileStream);

                fileStream.on('error', (err) => {
                    console.error('File stream error:', err);
                    return res.status(500).send("Error writing file.");
                });
            });
        
            busboy.on('finish', () => {
                if(!fields.filename)
                    return res.status(404).json({filename: "This field is required."});

                req.fields = fields;

                chunk.updateStats();
                req.chunk = chunk;
                req._saveto = saveto;

                return next();
            });
        }).catch((err) => {
            return res.status(404).end("File does not exists.");
        });
    }

    this.middlewares = [this.contentRangeMiddleWare, this.busboyMiddleWare]
}

ChunkUpload.prototype.continue = function(){
    return [function(req, res){
        Chunk.findByPk(req.params.chunkid).then((chunk) => {
            chunk.updateStats();

            return res.json({uploaded: chunk.uploaded});
        }).catch((err) => {
            return res.status(404).end();
        });
    }];
}

ChunkUpload.prototype.upload = function(){
    return [...this.middlewares];
}

ChunkUpload.prototype.complete = function(){
    return [...this.middlewares, async function(req, res, next){
        try {
            let tmdb_id = req.fields.tmdb_id;
            let seasonNumber = req.fields.season_number;
            let episodeNumber = req.fields.episode_number;

            let finishedFilePath = req.chunk.path;
            let ext = Path.extname(req?.fields?.filename || '');
            ext = ext.replace('.', '').toLocaleLowerCase();

            if(ALLOWED_EXTENSIONS.includes(ext)){
                let flixUrlReqBase = `${process.env.DJANGO_URL_PATH}/api`;
                let flixUrlReq = '';

                if(seasonNumber && episodeNumber) {
                    flixUrlReq = `${flixUrlReqBase}/series/${tmdb_id}/season/${seasonNumber}/episode/${episodeNumber}/`;
                }
                else {
                    flixUrlReq = `${flixUrlReqBase}/movie/${tmdb_id}/`;
                }

                const response = await axios.get(flixUrlReq);
                const flixPath = response.data.video_path;

                let newFilePath = Path.join(req._saveto, `/${flixPath}.${ext}`);
                let targetDir = Path.dirname(newFilePath);

                await fs.promises.mkdir(targetDir, { recursive: true });

                fs.rename(finishedFilePath, newFilePath, (error) => {
                    if (error) {
                        console.log('Error renaming file:', error);
                    }
                    else {
                        console.log('File renamed successfully:', `${finishedFilePath}.${ext}`);
                    }
                });
            }
            else {
                console.log('File extension not allowed:', ext);
            }

            await req.chunk.destroy();

            return next(); 
        } catch (error) {
            console.error('Upload complete error:', error);
            return res.status(500).end();
        }
    }];
}


ChunkUpload.prototype.cancel = function(){
    return [function(req, res){
        Chunk.findByPk(req.params.chunkid).then((chunk) => {
            fs.unlink(chunk.path, (err) => {
                if(err)
                    return res.status(404).end();
                chunk.destroy().then(() => {
                    res.status(200).end();
                }).catch((err) => {
                    res.status(500).end();
                })
            });
        }).catch((err) => {
            return res.status(404).end();
        });
}];
}

module.exports = ChunkUpload;