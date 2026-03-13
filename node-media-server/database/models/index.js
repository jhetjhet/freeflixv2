const Upload = require('./Upload');
const UploadPart = require('./UploadPart');

Upload.hasMany(UploadPart, {
    foreignKey: 'uploadId',
    as: 'parts',
    onDelete: 'CASCADE',
});

UploadPart.belongsTo(Upload, {
    foreignKey: 'uploadId',
    as: 'upload',
});

module.exports = {
    Upload,
    UploadPart,
};