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
    const busboy = new Busboy({
        headers: req.headers,
        limits: {
            files: 1,
            fileSize: maxChunkSize,
        },
    });

    const fields = {};
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

const getFinalObjectKey = async (fields, extension) => {
    let requestUrl = '';
    const baseApi = `${process.env.DJANGO_URL_PATH}/api`;

    if (fields.season_number && fields.episode_number) {
        requestUrl = `${baseApi}/series/${fields.tmdb_id}/season/${fields.season_number}/episode/${fields.episode_number}/`;
    } else {
        requestUrl = `${baseApi}/movie/${fields.tmdb_id}/`;
    }

    const response = await axios.get(requestUrl);
    const flixPath = normalizeObjectKey(response.data.video_path);

    if (!flixPath) {
        throw Object.assign(new Error('Django response did not contain a video_path.'), {
            status: 500,
        });
    }

    return `${flixPath}.${extension}`;
};

function UploadMiddleware(maxChunkSize = 10485760) {
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
            const upload = await Upload.findOne({
                where: { clientUploadId: req.params.chunkid },
            });

            if (!upload || upload.status === 'aborted') {
                return res.status(404).end();
            }

            return res.json({
                uploaded: upload.status === 'completed' ? upload.totalSize : getUploadedBytes(upload),
            });
        } catch {
            return res.status(404).end();
        }
    }];
};

UploadMiddleware.prototype.processChunkUpload = async function (req, res, next, { isComplete }) {
    try {
        validateAllowedExtension(req.fields.filename);

        const upload = await getOrCreateUpload({
            clientUploadId: req.params.chunkid,
            totalSize: req.contentRange.total,
            filename: req.fields.filename,
            contentType: req.fileMimeType,
        });

        if (upload.status === 'completed') {
            req.uploaded = upload.totalSize;
            req.upload = upload;
            next();
            return;
        }

        const actualChunkSize = req.chunkBuffer.length;
        const currentUploaded = getUploadedBytes(upload);
        const chunkEndExclusive = req.contentRange.start + actualChunkSize;

        if (req.contentRange.start < currentUploaded) {
            if (chunkEndExclusive <= currentUploaded) {
                req.uploaded = currentUploaded;
                req.upload = upload;
                next();
                return;
            }

            return res.status(409).send('Overlapping chunk upload is not allowed.');
        }

        if (req.contentRange.start > currentUploaded) {
            return res.status(409).send('Chunk upload is out of order.');
        }

        if (!isComplete && actualChunkSize === 0) {
            return res.status(400).send('Chunk payload is empty.');
        }

        const existingBuffer = upload.bufferedChunk ? Buffer.from(upload.bufferedChunk) : EMPTY_BUFFER;
        const combinedBuffer = actualChunkSize ? Buffer.concat([existingBuffer, req.chunkBuffer]) : existingBuffer;

        if (isComplete) {
            validateCompleteFields(req.fields);
            const extension = validateAllowedExtension(req.fields.filename);
            const finalObjectKey = await getFinalObjectKey(req.fields, extension);

            await persistBufferedData(upload, combinedBuffer);

            if (upload.bufferedSize > 0) {
                await flushBufferedPart(upload);
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

        await persistBufferedData(upload, combinedBuffer);

        if (upload.bufferedSize >= MIN_S3_PART_SIZE) {
            await flushBufferedPart(upload);
        }

        req.upload = upload;
        req.uploaded = getUploadedBytes(upload);
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

module.exports = UploadMiddleware;