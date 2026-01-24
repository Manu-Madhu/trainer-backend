const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');
const adminController = require('./admin.controller');

router.get('/stats', protect, admin, adminController.getAdminStats);
router.get('/payments/pending', protect, admin, adminController.getPendingPayments);
router.put('/payments/:id/approve', protect, admin, adminController.approvePayment);
router.put('/payments/:id/reject', protect, admin, adminController.rejectPayment);

module.exports = router;
