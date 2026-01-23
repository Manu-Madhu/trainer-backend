const subscriptionService = require('./subscription.service');

// @desc    Get subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getPlans = async (req, res) => {
    try {
        const plans = await subscriptionService.getPlans();
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Subscribe to a plan
// @route   POST /api/subscriptions/subscribe
// @access  Private
const subscribe = async (req, res) => {
    try {
        const { planId } = req.body;
        const result = await subscriptionService.subscribeUser(req.user._id, planId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Create plan (Admin)
// @route   POST /api/subscriptions/plans
// @access  Private (Admin)
const createPlan = async (req, res) => {
    try {
        const plan = await subscriptionService.createPlan(req.body);
        res.status(201).json(plan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get admin subscription stats
// @route   GET /api/subscriptions/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
    try {
        const stats = await subscriptionService.getAdminStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get admin paid users listing
// @route   GET /api/subscriptions/admin/users
// @access  Private (Admin)
const getAdminPaidUsers = async (req, res) => {
    try {
        const users = await subscriptionService.getAdminPaidUsers(req.query);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user payment history
// @route   GET /api/subscriptions/history/:userId
// @access  Private (Admin)
const getUserPaymentHistory = async (req, res) => {
    try {
        const result = await subscriptionService.getUserPaymentHistory(req.params.userId, req.query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my payment history
// @route   GET /api/subscriptions/my-history
// @access  Private
const getMyHistory = async (req, res) => {
    try {
        const result = await subscriptionService.getUserPaymentHistory(req.user._id, req.query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPlans,
    subscribe,
    createPlan,
    getAdminStats,
    getAdminPaidUsers,
    getUserPaymentHistory,
    getMyHistory
};
