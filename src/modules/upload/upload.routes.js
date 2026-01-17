const express = require('express');
const router = express.Router();
const uploadController = require('./upload.controller');
const uploadMiddleware = require('../../middleware/upload');

// Single file upload
router.post('/', uploadMiddleware.single('file'), uploadController.uploadFile);

// Multiple files upload
router.post('/multiple', uploadMiddleware.array('files', 5), uploadController.uploadFiles);

module.exports = router;
