const express = require('express');
const router = express.Router();
const { getPaymentSettings, updatePaymentSettings } = require('./settings.controller');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/payment', getPaymentSettings);
router.put('/payment', protect, admin, updatePaymentSettings);

module.exports = router;
