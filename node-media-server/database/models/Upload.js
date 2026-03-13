const { DataTypes, Model } = require('sequelize');
const database = require('../database');

class Upload extends Model {}

Upload.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    clientUploadId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        field: 'client_upload_id',
    },
    s3MultipartUploadId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 's3_multipart_upload_id',
    },
    objectKey: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'object_key',
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'initiated',
        validate: {
            isIn: [['initiated', 'uploading', 'completed', 'aborted']],
        },
    },
    totalPartSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_part_size',
    },
    totalSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'total_size',
    },
    bufferedSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'buffered_size',
    },
    bufferedChunk: {
        type: DataTypes.BLOB('long'),
        allowNull: true,
        field: 'buffered_chunk',
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at',
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
    },
}, {
    sequelize: database,
    modelName: 'Upload',
    tableName: 'uploads',
    updatedAt: false,
});

Upload.prototype.getUploadedBytes = function () {
    return this.totalPartSize + this.bufferedSize;
};

module.exports = Upload;