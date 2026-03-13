const { DataTypes, Model } = require('sequelize');
const database = require('../database');

class UploadPart extends Model {}

UploadPart.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    uploadId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'upload_id',
        references: {
            model: 'uploads',
            key: 'id',
        },
    },
    partNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'part_number',
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    etag: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
    },
}, {
    sequelize: database,
    modelName: 'UploadPart',
    tableName: 'upload_parts',
    updatedAt: false,
    indexes: [
        {
            unique: true,
            fields: ['upload_id', 'part_number'],
        },
    ],
});

module.exports = UploadPart;