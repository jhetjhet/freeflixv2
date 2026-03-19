const router = require('express').Router();
const UploadMiddleWare = require('../middlewares/upload-middleware');

var uploadMiddleWare = new UploadMiddleWare();

router.get('/:chunkid/', uploadMiddleWare.continue());
router.post('/:chunkid/', uploadMiddleWare.upload(), function(req, res){
    return res.json({uploaded: req.uploaded});
});
router.post('/complete/:chunkid/', uploadMiddleWare.complete(), function(req, res){
    return res.json({uploaded: req.uploaded});
});
// Parallel upload finalize: no file payload, just metadata to complete the multipart upload.
router.post('/finalize/:chunkid/', ...uploadMiddleWare.finalize());
router.delete('/cancel/:chunkid/', uploadMiddleWare.cancel());

module.exports = router;