const {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    S3Client,
    UploadPartCommand,
} = require('@aws-sdk/client-s3');

const DEFAULT_PRESIGNED_URL_EXPIRES_SECONDS = parseInt(process.env.PRESIGNED_URL_EXPIRES_SECONDS, 10) || 300;

const parseBoolean = (value, fallback = false) => {
    if (value === undefined) {
        return fallback;
    }

    return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: parseBoolean(process.env.S3_FORCE_PATH_STYLE, true),
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const getBucketName = () => {
    if (!process.env.S3_BUCKET_NAME) {
        throw new Error('S3_BUCKET_NAME is required.');
    }

    return process.env.S3_BUCKET_NAME;
};

const getPresignedUrlExpiresSeconds = () => {
    const rawValue = parseInt(process.env.PRESIGNED_URL_EXPIRES_SECONDS, 10);

    if (Number.isNaN(rawValue) || rawValue <= 0) {
        return DEFAULT_PRESIGNED_URL_EXPIRES_SECONDS;
    }

    return rawValue;
};

const createMultipartUpload = async ({ key, contentType }) => {
    const response = await s3Client.send(new CreateMultipartUploadCommand({
        Bucket: getBucketName(),
        Key: key,
        ContentType: contentType || 'application/octet-stream',
    }));

    return response.UploadId;
};

const uploadPart = async ({ key, uploadId, partNumber, body }) => {
    const response = await s3Client.send(new UploadPartCommand({
        Bucket: getBucketName(),
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
    }));

    return response.ETag;
};

const completeMultipartUpload = async ({ key, uploadId, parts }) => {
    return s3Client.send(new CompleteMultipartUploadCommand({
        Bucket: getBucketName(),
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: parts,
        },
    }));
};

const abortMultipartUpload = async ({ key, uploadId }) => {
    return s3Client.send(new AbortMultipartUploadCommand({
        Bucket: getBucketName(),
        Key: key,
        UploadId: uploadId,
    }));
};

const copyObject = async ({ sourceKey, destinationKey }) => {
    return s3Client.send(new CopyObjectCommand({
        Bucket: getBucketName(),
        CopySource: `${getBucketName()}/${sourceKey}`,
        Key: destinationKey,
    }));
};

const deleteObject = async ({ key }) => {
    return s3Client.send(new DeleteObjectCommand({
        Bucket: getBucketName(),
        Key: key,
    }));
};

module.exports = {
    abortMultipartUpload,
    completeMultipartUpload,
    copyObject,
    createMultipartUpload,
    deleteObject,
    getPresignedUrlExpiresSeconds,
    s3Client,
    uploadPart,
};