const Busboy = require('busboy');
const axios = require('axios');
const Path = require('path');
const { Upload, UploadPart } = require('../database/models');
const {
    abortMultipartUpload,
    completeMultipartUpload,
    copyObject,
    createMultipartUpload,
    deleteObject,
    uploadPart,
} = require('../s3');

const CONTENT_RANGE_RE = /bytes\s+(?<start>\d+)-(?<end>\d+)\/(?<total>\d+)/;
const MIN_S3_PART_SIZE = 5 * 1024 * 1024;
const EMPTY_BUFFER = Buffer.alloc(0);

const ALLOWED_EXTENSIONS = ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'ogv'];

const EXTENSION_MIME_MAP = {
    mp4:  'video/mp4',
    mkv:  'video/x-matroska',
    webm: 'video/webm',
    avi:  'video/x-msvideo',
    mov:  'video/quicktime',
    flv:  'video/x-flv',
    ogv:  'video/ogg',
};

const getMimeTypeFromExtension = (filename) => {
    const ext = Path.extname(filename || '').replace('.', '').toLowerCase();
    return EXTENSION_MIME_MAP[ext] || 'application/octet-stream';
};

// Validates a value is a safe positive integer string to prevent path injection in URLs
const validatePositiveInteger = (value, name) => {
    const str = String(value ?? '').trim();
    const num = parseInt(str, 10);
    if (!Number.isInteger(num) || num <= 0 || String(num) !== str) {
        throw Object.assign(new Error(`Invalid ${name}: must be a positive integer.`), { status: 400 });
    }
    return num;
};

// Only allows UUID-format clientUploadIds to prevent injection in DB queries
const CLIENT_UPLOAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const buildPendingObjectKey = (clientUploadId, filename) => {
    const extension = Path.extname(filename || '').toLowerCase();
    return `uploads/incomplete/${clientUploadId}${extension}`;
};

const getUploadedBytes = (upload) => upload.totalPartSize + upload.bufferedSize;

const getExtension = (filename) => Path.extname(filename || '').replace('.', '').toLowerCase();

const normalizeObjectKey = (value) => String(value || '').replace(/^\/+/, '').replace(/\\/g, '/');

const getRangeSize = ({ start, end }, actualSize) => {
    const exclusiveSize = end - start;
    const inclusiveSize = end - start + 1;

    if (actualSize === exclusiveSize || actualSize === inclusiveSize) {
        return actualSize;
    }

    throw Object.assign(new Error('Content-Range does not match uploaded chunk size.'), {
        status: 400,
    });
};

const validateAllowedExtension = (filename) => {
    const extension = getExtension(filename);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw Object.assign(new Error(`Extension not allowed: ${extension}`), {
            status: 400,
        });
    }

    return extension;
};

const validateCompleteFields = (fields) => {
    if (!fields.tmdb_id) {
        throw Object.assign(new Error('tmdb_id field required.'), {
            status: 400,
        });
    }

    if ((fields.season_number && !fields.episode_number) || (!fields.season_number && fields.episode_number)) {
        throw Object.assign(new Error('season_number and episode_number must both be provided.'), {
            status: 400,
        });
    }
};

const parseMultipartRequest = (req, maxChunkSize) => new Promise((resolve, reject) => {
    const busboy = Busboy({
        headers: req.headers,
        limits: {
            files: 1,
            fileSize: maxChunkSize + 1, // +1 so exact-size chunks don't trigger the limit event
        },
    });

    const fields = Object.create(null);
    const fileChunks = [];
    let fileFieldSeen = false;
    let fileMimeType = 'application/octet-stream';
    let finished = false;

    const fail = (status, message) => {
        if (finished) {
            return;
        }

        finished = true;
        reject(Object.assign(new Error(message), { status }));
    };

    busboy.on('field', (name, value) => {
        fields[name] = value;
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (fieldname !== 'chunk') {
            file.resume();
            fail(400, "Expected field 'chunk'.");
            return;
        }

        fileFieldSeen = true;
        fileMimeType = mimetype || fileMimeType;

        file.on('data', (data) => {
            fileChunks.push(data);
        });

        file.on('limit', () => {
            fail(400, 'Chunk exceeds maximum allowed size.');
        });

        file.on('error', (error) => {
            fail(500, error.message || 'Chunk stream failed.');
        });
    });

    busboy.on('error', (error) => {
        fail(500, error.message || 'Multipart parsing failed.');
    });

    busboy.on('finish', () => {
        if (finished) {
            return;
        }

        if (!fileFieldSeen) {
            fail(400, "Expected field 'chunk'.");
            return;
        }

        if (!fields.filename) {
            fail(400, 'filename field required.');
            return;
        }

        finished = true;
        resolve({
            fields,
            chunkBuffer: Buffer.concat(fileChunks),
            fileMimeType,
        });
    });

    req.pipe(busboy);
});

const getOrCreateUpload = async ({ clientUploadId, totalSize, filename, contentType }) => {
    let upload = await Upload.findOne({ where: { clientUploadId } });

    if (upload && upload.status === 'aborted') {
        const newObjectKey = buildPendingObjectKey(clientUploadId, filename);
        const multipartUploadId = await createMultipartUpload({
            key: newObjectKey,
            contentType,
        });

        await UploadPart.destroy({ where: { uploadId: upload.id } });

        upload.s3MultipartUploadId = multipartUploadId;
        upload.objectKey = newObjectKey;
        upload.status = 'initiated';
        upload.totalPartSize = 0;
        upload.totalSize = totalSize;
        upload.bufferedSize = 0;
        upload.bufferedChunk = null;
        upload.completedAt = null;
        await upload.save();
        return upload;
    }

    if (upload) {
        if (upload.totalSize !== totalSize) {
            throw Object.assign(new Error('Content-Range total does not match existing upload.'), {
                status: 409,
            });
        }

        return upload;
    }

    const objectKey = buildPendingObjectKey(clientUploadId, filename);
    const multipartUploadId = await createMultipartUpload({
        key: objectKey,
        contentType,
    });

    try {
        upload = await Upload.create({
            clientUploadId,
            s3MultipartUploadId: multipartUploadId,
            objectKey,
            status: 'initiated',
            totalPartSize: 0,
            totalSize,
            bufferedSize: 0,
            bufferedChunk: null,
        });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            // A parallel chunk beat us to the INSERT. Abort the S3 multipart upload
            // we just created (it will never be used) and return the winner's record.
            try { await abortMultipartUpload({ key: objectKey, uploadId: multipartUploadId }); } catch {}
            upload = await Upload.findOne({ where: { clientUploadId } });
            if (!upload) throw err;
            return upload;
        }
        throw err;
    }

    return upload;
};

const persistBufferedData = async (upload, buffer) => {
    upload.bufferedChunk = buffer.length ? buffer : null;
    upload.bufferedSize = buffer.length;

    if (upload.status === 'initiated' && buffer.length > 0) {
        upload.status = 'uploading';
    }

    await upload.save();
};

const flushBufferedPart = async (upload) => {
    const buffer = upload.bufferedChunk ? Buffer.from(upload.bufferedChunk) : EMPTY_BUFFER;

    if (!buffer.length) {
        return upload;
    }

    const partNumber = (await UploadPart.max('partNumber', {
        where: { uploadId: upload.id },
    }) || 0) + 1;

    const etag = await uploadPart({
        key: upload.objectKey,
        uploadId: upload.s3MultipartUploadId,
        partNumber,
        body: buffer,
    });

    await UploadPart.create({
        uploadId: upload.id,
        partNumber,
        size: buffer.length,
        etag,
    });

    upload.totalPartSize += buffer.length;
    upload.bufferedChunk = null;
    upload.bufferedSize = 0;
    upload.status = 'uploading';
    await upload.save();

    return upload;
};

const getDjangoApiUrl = (fields) => {
    const baseApi = `${process.env.DJANGO_URL_PATH}/api`;
    const tmdbId = validatePositiveInteger(fields.tmdb_id, 'tmdb_id');
    if (fields.season_number && fields.episode_number) {
        const season = validatePositiveInteger(fields.season_number, 'season_number');
        const episode = validatePositiveInteger(fields.episode_number, 'episode_number');
        return `${baseApi}/series/${tmdbId}/season/${season}/episode/${episode}/`;
    }
    return `${baseApi}/movie/${tmdbId}/`;
};

const getFinalObjectKey = async (fields, extension) => {
    const requestUrl = getDjangoApiUrl(fields);
    const response = await axios.get(requestUrl, {
        headers: { 'X-Node-Service-Token': process.env.NODE_SERVICE_TOKEN || '' },
    });
    const flixPath = normalizeObjectKey(response.data.video_path);

    if (!flixPath) {
        throw Object.assign(new Error('Django response did not contain a video_path.'), {
            status: 500,
        });
    }

    // Strip existing extension from the stored path then append the real one
    const basePath = flixPath.replace(/\.[^/.]+$/, '');
    return `${basePath}.${extension}`;
};

const patchDjangoExtension = async (fields, extension) => {
    const requestUrl = getDjangoApiUrl(fields);
    await axios.patch(
        requestUrl,
        { extension, has_video: true },
        {
            headers: {
                'X-Node-Service-Token': process.env.NODE_SERVICE_TOKEN || '',
                'Content-Type': 'application/json',
            },
        },
    );
};

function UploadMiddleware(maxChunkSize = 1048576 * 5) {
    this.maxChunkSize = maxChunkSize;

    this.contentRangeMiddleWare = (req, res, next) => {
        const header = req.get('content-range');

        if (!header) {
            return res.status(400).send('Missing content-range header.');
        }

        const match = header.match(CONTENT_RANGE_RE);

        if (!match) {
            return res.status(400).send('Invalid content-range header.');
        }

        const start = parseInt(match.groups.start, 10);
        const end = parseInt(match.groups.end, 10);
        const total = parseInt(match.groups.total, 10);

        if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(total) || start < 0 || end < start || total < 0) {
            return res.status(400).send('Invalid content-range header.');
        }

        req.contentRange = { start, end, total };
        next();
    };

    this.multipartMiddleWare = async (req, res, next) => {
        try {
            const parsed = await parseMultipartRequest(req, this.maxChunkSize);
            const actualChunkSize = parsed.chunkBuffer.length;

            if (actualChunkSize > this.maxChunkSize) {
                return res.status(400).send('Chunk exceeds maximum allowed size.');
            }

            getRangeSize(req.contentRange, actualChunkSize);

            req.fields = parsed.fields;
            req.chunkBuffer = parsed.chunkBuffer;
            req.fileMimeType = parsed.fileMimeType;

            next();
        } catch (error) {
            res.status(error.status || 500).send(error.message || 'Chunk parsing failed.');
        }
    };
}

UploadMiddleware.prototype.continue = function () {
    return [async function (req, res) {
        try {
            if (!CLIENT_UPLOAD_ID_RE.test(req.params.chunkid)) {
                return res.status(400).end();
            }

            const upload = await Upload.findOne({
                where: { clientUploadId: req.params.chunkid },
            });

            if (!upload || upload.status === 'aborted') {
                return res.status(404).end();
            }

            const parts = await UploadPart.findAll({
                where: { uploadId: upload.id },
                attributes: ['partNumber', 'size'],
            });

            // Sum part sizes from the DB rather than relying on upload.totalPartSize,
            // which can be underreported due to concurrent-write races during parallel upload.
            const uploadedFromParts = parts.reduce((sum, p) => sum + p.size, 0);

            return res.json({
                uploaded: upload.status === 'completed' ? upload.totalSize : uploadedFromParts,
                completedParts: parts.map(p => p.partNumber),
            });
        } catch {
            return res.status(404).end();
        }
    }];
};

UploadMiddleware.prototype.processChunkUpload = async function (req, res, next, { isComplete }) {
    try {
        if (!CLIENT_UPLOAD_ID_RE.test(req.params.chunkid)) {
            return res.status(400).send('Invalid upload ID.');
        }

        validateAllowedExtension(req.fields.filename);

        const upload = await getOrCreateUpload({
            clientUploadId: req.params.chunkid,
            totalSize: req.contentRange.total,
            filename: req.fields.filename,
            contentType: getMimeTypeFromExtension(req.fields.filename),
        });

        if (upload.status === 'completed') {
            req.uploaded = upload.totalSize;
            req.upload = upload;
            next();
            return;
        }

        const actualChunkSize = req.chunkBuffer.length;

        if (actualChunkSize === 0) {
            return res.status(400).send('Chunk payload is empty.');
        }

        // Derive the S3 part number from the chunk's starting byte offset.
        // Chunks must be exactly maxChunkSize bytes (except the last one).
        const partNumber = Math.floor(req.contentRange.start / this.maxChunkSize) + 1;
        const isLastChunk = req.contentRange.end === req.contentRange.total;

        if (!isLastChunk && actualChunkSize < MIN_S3_PART_SIZE) {
            return res.status(400).send(`Non-final chunks must be at least ${MIN_S3_PART_SIZE} bytes.`);
        }

        if (isComplete) {
            validateCompleteFields(req.fields);
            const extension = validateAllowedExtension(req.fields.filename);
            const finalObjectKey = await getFinalObjectKey(req.fields, extension);

            // Upload the final part (may be smaller than MIN_S3_PART_SIZE — allowed by S3).
            const existingLastPart = await UploadPart.findOne({ where: { uploadId: upload.id, partNumber } });
            if (!existingLastPart) {
                const etag = await uploadPart({
                    key: upload.objectKey,
                    uploadId: upload.s3MultipartUploadId,
                    partNumber,
                    body: req.chunkBuffer,
                });
                try {
                    await UploadPart.create({
                        uploadId: upload.id,
                        partNumber,
                        size: actualChunkSize,
                        etag,
                    });
                    upload.totalPartSize += actualChunkSize;
                    await upload.save();
                } catch (err) {
                    if (err.name !== 'SequelizeUniqueConstraintError') throw err;
                }
            }

            const parts = await UploadPart.findAll({
                where: { uploadId: upload.id },
                order: [['partNumber', 'ASC']],
            });

            if (!parts.length) {
                return res.status(400).send('No uploaded parts found for completion.');
            }

            await completeMultipartUpload({
                key: upload.objectKey,
                uploadId: upload.s3MultipartUploadId,
                parts: parts.map((part) => ({
                    ETag: part.etag,
                    PartNumber: part.partNumber,
                })),
            });

            if (upload.objectKey !== finalObjectKey) {
                await copyObject({
                    sourceKey: upload.objectKey,
                    destinationKey: finalObjectKey,
                });
                await deleteObject({ key: upload.objectKey });
                upload.objectKey = finalObjectKey;
            }

            await patchDjangoExtension(req.fields, extension);

            upload.status = 'completed';
            upload.completedAt = new Date();
            upload.totalPartSize = upload.totalSize;
            upload.bufferedChunk = null;
            upload.bufferedSize = 0;
            await upload.save();

            req.upload = upload;
            req.uploaded = upload.totalSize;
            next();
            return;
        }

        // Non-final chunk: upload directly as an S3 part (no buffering needed since
        // chunkSize === MIN_S3_PART_SIZE). Idempotent — skip if already uploaded.
        const existingPart = await UploadPart.findOne({ where: { uploadId: upload.id, partNumber } });
        if (existingPart) {
            req.uploaded = upload.totalPartSize;
            req.upload = upload;
            next();
            return;
        }

        const etag = await uploadPart({
            key: upload.objectKey,
            uploadId: upload.s3MultipartUploadId,
            partNumber,
            body: req.chunkBuffer,
        });

        try {
            await UploadPart.create({
                uploadId: upload.id,
                partNumber,
                size: actualChunkSize,
                etag,
            });
            upload.totalPartSize += actualChunkSize;
            if (upload.status === 'initiated') upload.status = 'uploading';
            await upload.save();
        } catch (err) {
            // A parallel request for the same part won the INSERT race — that's fine,
            // the part is already recorded. S3 last-write-wins for the same part number.
            if (err.name !== 'SequelizeUniqueConstraintError') throw err;
        }

        req.upload = upload;
        req.uploaded = upload.totalPartSize;
        next();
    } catch (error) {
        console.error('Upload processing error:', error);
        res.status(error.status || 500).send(error.message || 'Upload processing failed.');
    }
};

UploadMiddleware.prototype.upload = function () {
    return [
        this.contentRangeMiddleWare,
        this.multipartMiddleWare,
        async (req, res, next) => this.processChunkUpload(req, res, next, { isComplete: false }),
    ];
};

UploadMiddleware.prototype.complete = function () {
    return [
        this.contentRangeMiddleWare,
        this.multipartMiddleWare,
        async (req, res, next) => this.processChunkUpload(req, res, next, { isComplete: true }),
    ];
};

UploadMiddleware.prototype.cancel = function () {
    return [
        async function (req, res) {
            try {
                if (!CLIENT_UPLOAD_ID_RE.test(req.params.chunkid)) {
                    return res.status(400).end();
                }

                const upload = await Upload.findOne({
                    where: { clientUploadId: req.params.chunkid },
                });

                if (!upload) {
                    return res.status(404).end();
                }

                if (upload.status !== 'completed' && upload.status !== 'aborted') {
                    await abortMultipartUpload({
                        key: upload.objectKey,
                        uploadId: upload.s3MultipartUploadId,
                    });
                }

                upload.status = 'aborted';
                upload.bufferedChunk = null;
                upload.bufferedSize = 0;
                await upload.save();

                await UploadPart.destroy({ where: { uploadId: upload.id } });

                return res.status(200).end();
            } catch (error) {
                console.error('Upload cancel error:', error);
                return res.status(404).end();
            }
        },
    ];
};

// Finalizes a parallel upload: completes the S3 multipart upload and notifies Django.
// Called by the client after all chunk parts have been uploaded via POST /:chunkid/.
// Receives JSON body: { filename, tmdb_id, season_number?, episode_number? }
UploadMiddleware.prototype.finalize = function () {
    return [
        async (req, res) => {
            try {
                if (!CLIENT_UPLOAD_ID_RE.test(req.params.chunkid)) {
                    return res.status(400).send('Invalid upload ID.');
                }

                validateCompleteFields(req.body);

                if (!req.body.filename) {
                    return res.status(400).send('filename is required.');
                }

                const upload = await Upload.findOne({
                    where: { clientUploadId: req.params.chunkid },
                });

                if (!upload) {
                    return res.status(404).send('Upload not found.');
                }

                if (upload.status === 'completed') {
                    return res.json({ uploaded: upload.totalSize });
                }

                const extension = validateAllowedExtension(req.body.filename);
                const finalObjectKey = await getFinalObjectKey(req.body, extension);

                const parts = await UploadPart.findAll({
                    where: { uploadId: upload.id },
                    order: [['partNumber', 'ASC']],
                });

                if (!parts.length) {
                    return res.status(400).send('No uploaded parts found for completion.');
                }

                await completeMultipartUpload({
                    key: upload.objectKey,
                    uploadId: upload.s3MultipartUploadId,
                    parts: parts.map((part) => ({
                        ETag: part.etag,
                        PartNumber: part.partNumber,
                    })),
                });

                if (upload.objectKey !== finalObjectKey) {
                    await copyObject({
                        sourceKey: upload.objectKey,
                        destinationKey: finalObjectKey,
                    });
                    await deleteObject({ key: upload.objectKey });
                    upload.objectKey = finalObjectKey;
                }

                await patchDjangoExtension(req.body, extension);

                upload.status = 'completed';
                upload.completedAt = new Date();
                upload.totalPartSize = upload.totalSize;
                upload.bufferedChunk = null;
                upload.bufferedSize = 0;
                await upload.save();

                return res.json({ uploaded: upload.totalSize });
            } catch (error) {
                console.error('Finalize error:', error);
                const isUpstream = !!error.response; // axios error from Django/S3
                res.status(isUpstream ? 502 : (error.status || 500)).send(error.message || 'Finalize failed.');
            }
        },
    ];
};

module.exports = UploadMiddleware;