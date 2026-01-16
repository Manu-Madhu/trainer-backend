const express = require('express');
const router = express.Router();
const progressController = require('./progress.controller');
const { protect, trainer } = require('../../middleware/authMiddleware');

router.post('/', protect, progressController.logProgress);
router.get('/history', protect, progressController.getProgressHistory);
router.post('/feedback', protect, trainer, progressController.addFeedback);

module.exports = router;
