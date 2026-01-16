const express = require('express');
const router = express.Router();
const subscriptionController = require('./subscription.controller');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/plans', subscriptionController.getPlans);
router.post('/plans', protect, admin, subscriptionController.createPlan);
router.post('/subscribe', protect, subscriptionController.subscribe);

module.exports = router;
