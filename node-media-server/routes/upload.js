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
router.delete('/cancel/:chunkid/', uploadMiddleWare.cancel());

module.exports = router;