const SubscriptionPlan = require('./subscription.model');
const User = require('../user/user.model');
const Payment = require('./payment.model');

const getPlans = async () => {
    return await SubscriptionPlan.find({ isActive: true });
};

const subscribeUser = async (userId, planId) => {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) throw new Error('Plan not found');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationInDays);

    const user = await User.findById(userId);
    user.subscription = {
        plan: 'premium',
        status: 'active',
        startDate,
        endDate
    };

    // Create an initial payment record
    await Payment.create({
        user: userId,
        amount: plan.price,
        month: startDate.getMonth() + 1,
        year: startDate.getFullYear(),
        status: 'paid',
        paidAt: startDate,
        method: 'manual'
    });

    return await user.save();
};

const createPlan = async (planData) => {
    return await SubscriptionPlan.create(planData);
};

/**
 * ADMIN FUNCTIONS
 */

const getAdminStats = async () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Total Earnings (Status: paid)
    const totalEarning = await Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // 2. Total Pending
    const totalPending = await Payment.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // 3. This Month Collection
    const monthCollection = await Payment.aggregate([
        { $match: { status: 'paid', month: currentMonth, year: currentYear } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // 4. This Month Pending
    const monthPending = await Payment.aggregate([
        { $match: { status: 'pending', month: currentMonth, year: currentYear } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    return {
        totalEarning: totalEarning[0]?.total || 0,
        totalPending: totalPending[0]?.total || 0,
        monthCollection: monthCollection[0]?.total || 0,
        monthPending: monthPending[0]?.total || 0
    };
};

const getAdminPaidUsers = async (query = {}) => {
    const { search, from, to } = query;
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // Find all users with premium plan
    let userQuery = { 'subscription.plan': 'premium' };
    if (search) {
        userQuery.name = { $regex: search, $options: 'i' };
    }

    const users = await User.find(userQuery).select('name email phone subscription avatar');

    // For each user, check current month payment status
    const userList = await Promise.all(users.map(async (user) => {
        const payment = await Payment.findOne({
            user: user._id,
            month: curMonth,
            year: curYear
        });

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            subscription: user.subscription,
            currentMonthStatus: payment ? payment.status : 'due',
            lastAmount: payment ? payment.amount : (user.subscription.lastPrice || 0)
        };
    }));

    return userList;
};

const getUserPaymentHistory = async (userId) => {
    return await Payment.find({ user: userId }).sort({ year: -1, month: -1 });
};

module.exports = {
    getPlans,
    subscribeUser,
    createPlan,
    getAdminStats,
    getAdminPaidUsers,
    getUserPaymentHistory
};
