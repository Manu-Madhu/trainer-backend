const express = require('express');
const router = express.Router();
const subscriptionController = require('./subscription.controller');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/plans', subscriptionController.getPlans);
router.post('/plans', protect, admin, subscriptionController.createPlan);
router.post('/subscribe', protect, subscriptionController.subscribe);

// Admin Specific
router.get('/admin/stats', protect, admin, subscriptionController.getAdminStats);
router.get('/admin/users', protect, admin, subscriptionController.getAdminPaidUsers);
router.get('/history/:userId', protect, admin, subscriptionController.getUserPaymentHistory);
router.get('/my-history', protect, subscriptionController.getMyHistory);

module.exports = router;
