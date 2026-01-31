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
    const { search, from, to, page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    // 1. Build Base User Query
    let userQuery = { 'subscription.plan': 'premium' };

    if (search) {
        userQuery.name = { $regex: search, $options: 'i' };
    }

    if (from || to) {
        userQuery['subscription.startDate'] = {};
        if (from) userQuery['subscription.startDate'].$gte = new Date(from);
        if (to) userQuery['subscription.startDate'].$lte = new Date(to);
    }

    // 2. Fetch Users with Pagination
    const users = await User.find(userQuery)
        .select('name email phone subscription avatar')
        .skip(skip)
        .limit(parseInt(limit));

    const total = await User.countDocuments(userQuery);

    // 3. Attach Payment Status for Current Month
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

    return { users: userList, total };
};

const getUserPaymentHistory = async (userId, query = {}) => {
    const { status, page = 1, limit = 10, from, to, search } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { user: userId };
    if (status) {
        filter.status = status;
    }

    if (from && to) {
        filter.createdAt = { $gte: new Date(from), $lte: new Date(to) };
    }

    if (search) {
        const searchNumber = parseInt(search);
        const searchRegex = { $regex: search, $options: 'i' };

        const orConditions = [
            { notes: searchRegex },
            { transactionId: searchRegex }
        ];

        // Search by Year or Month (number)
        if (!isNaN(searchNumber)) {
            orConditions.push({ year: searchNumber });
            if (searchNumber >= 1 && searchNumber <= 12) {
                orConditions.push({ month: searchNumber });
            }
        }

        // Search by Month Name
        const months = ["january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"];
        const monthIndex = months.findIndex(m => m.startsWith(search.toLowerCase()));
        if (monthIndex !== -1) {
            orConditions.push({ month: monthIndex + 1 });
        }

        filter.$or = orConditions;
    }

    const history = await Payment.find(filter)
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    return { history, total };
};

const getPendingPayments = async (query = {}) => {
    const { page = 1, limit = 10, search } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = { status: 'pending' };

    // If search is needed, we might need to look up users first or use aggregate
    // For simplicity, let's just populate user for now
    const payments = await Payment.find(filter)
        .populate('user', 'name email phone avatar subscription')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Payment.countDocuments(filter);

    return { payments, total };
};

const approvePayment = async (paymentId) => {
    const payment = await Payment.findById(paymentId).populate('user');
    if (!payment) {
        throw new Error('Payment not found');
    }

    if (payment.status === 'paid') {
        throw new Error('Payment already approved');
    }

    // 1. Mark Payment as Paid
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    // 2. Update User Subscription
    const user = payment.user;
    if (!user) throw new Error('User not associated with payment');

    const now = new Date();
    let startDate = now;
    let endDate = new Date(now);

    // Helper to add 1 month safely
    const addOneMonth = (date) => {
        const d = new Date(date);
        const originalDay = d.getDate();
        d.setMonth(d.getMonth() + 1);
        if (d.getDate() !== originalDay) {
            d.setDate(0); // Snap to last day of previous month (which is the intended month)
        }
        return d;
    };

    endDate = addOneMonth(startDate);

    // If user is already premium and not expired, extend from existing endDate
    if (user.subscription && user.subscription.plan === 'premium' && user.subscription.endDate) {
        const existingEnd = new Date(user.subscription.endDate);
        if (existingEnd > now) {
            startDate = user.subscription.startDate || now; // Keep original start
            endDate = addOneMonth(existingEnd);
        }
    }

    user.subscription = {
        plan: 'premium',
        status: 'active',
        startDate: startDate,
        endDate: endDate
    };

    await user.save();

    return { payment, user };
};

const rejectPayment = async (paymentId, reason) => {
    const payment = await Payment.findById(paymentId);
    if (!payment) throw new Error('Payment not found');

    if (payment.status !== 'pending') {
        throw new Error('Can only reject pending payments');
    }

    payment.status = 'failed'; // or 'rejected' if you add that enum value, but 'failed' works for now or let's stick to schemas
    // Schema says: enum: ['paid', 'pending', 'failed', 'refunded']
    // Let's use 'failed' effectively meaning rejected here
    payment.rejectionReason = reason;
    await payment.save();

    return payment;
};

module.exports = {
    getPlans,
    subscribeUser,
    createPlan,
    getAdminStats,
    getAdminPaidUsers,
    getUserPaymentHistory,
    getPendingPayments,
    approvePayment,
    rejectPayment
};
