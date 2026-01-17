const User = require('../user/user.model');

// @desc    Get Admin Stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalTrainers = await User.countDocuments({ role: 'trainer' });

        // Mocking revenue for now as Subscription model might be basic
        const revenue = 12500;

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

module.exports = {
    getAdminStats
};
