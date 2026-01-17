const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');
const adminController = require('./admin.controller');

router.get('/stats', protect, admin, adminController.getAdminStats);

module.exports = router;
