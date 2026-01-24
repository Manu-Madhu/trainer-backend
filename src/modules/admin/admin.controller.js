const User = require('../user/user.model');

// @desc    Get Admin Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalTrainers = await User.countDocuments({ role: 'trainer' });
        const totalPremiumUsers = await User.countDocuments({ 'subscription.plan': 'premium' });

        // Calculate revenue based on active premium subscriptions (Assuming ₹999/month)
        const revenue = totalPremiumUsers * 999;


        // Get recent users (last 5)
        const recentUsers = await User.find({ role: 'user' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password');

        res.json({
            users: totalUsers,
            trainers: totalTrainers,
            revenue,
            recentUsers
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const subscriptionService = require('../subscription/subscription.service');

// ... existing getAdminStats ...

// @desc    Get Pending Payments
// @route   GET /api/admin/payments/pending
// @access  Private/Admin
const getPendingPayments = async (req, res) => {
    try {
        const result = await subscriptionService.getPendingPayments(req.query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve Payment
// @route   PUT /api/admin/payments/:id/approve
// @access  Private/Admin
const approvePayment = async (req, res) => {
    try {
        const result = await subscriptionService.approvePayment(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Reject Payment
// @route   PUT /api/admin/payments/:id/reject
// @access  Private/Admin
const rejectPayment = async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await subscriptionService.rejectPayment(req.params.id, reason);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getAdminStats,
    getPendingPayments,
    approvePayment,
    rejectPayment
};
