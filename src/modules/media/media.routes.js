const express = require('express');
const router = express.Router();
const mediaService = require('./media.service');
const mediaController = require('./media.controller');

// 'file' is the key name in the form-data
router.post('/upload', mediaService.upload.single('file'), mediaController.uploadMedia);

module.exports = router;
