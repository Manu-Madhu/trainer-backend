const SubscriptionPlan = require('./subscription.model');
const User = require('../user/user.model');
const Payment = require('./payment.model');
const Settings = require('../settings/settings.model');
const crypto = require('crypto');
const razorpay = require('../../config/razorpay');

// Helper to add 1 month safely
const addOneMonth = (date) => {
    const d = new Date(date);
    const originalDay = d.getDate();
    d.setMonth(d.getMonth() + 1);
    if (d.getDate() !== originalDay) {
        d.setDate(0); // Snap to last day of previous month
    }
    return d;
};

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

    // Sync pending payments with current settings price if changed
    const settings = await Settings.findOne({ type: 'payment_config' });
    if (settings) {
        await Payment.updateMany({ status: 'pending' }, { amount: settings.amount });
    }

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

    // Update Payment Record with the coverage period
    payment.startDate = startDate;
    payment.endDate = endDate;
    await payment.save();

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

const createRazorpayOrder = async (userId, planId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    let amount = 500;
    if (planId) {
        const plan = await SubscriptionPlan.findById(planId);
        if (plan) {
            amount = plan.price;
        }
    } else {
        const settings = await Settings.findOne({ type: 'payment_config' });
        if (settings && settings.amount) {
            amount = settings.amount;
        }
    }

    const now = new Date();
    // Determine billing target month/year based on whether current subscription is active
    let baseDate = now;
    if (user.subscription && user.subscription.plan === 'premium' && user.subscription.endDate) {
        const existingEnd = new Date(user.subscription.endDate);
        if (existingEnd > now) {
            baseDate = existingEnd;
        }
    }

    let targetMonth = baseDate.getMonth() + 1;
    let targetYear = baseDate.getFullYear();

    // Create order with Razorpay
    const options = {
        amount: Math.round(amount * 100), // amount in paise
        currency: 'INR',
        receipt: `rcpt_${Date.now().toString().slice(-8)}_${userId.toString().slice(-4)}`,
        notes: {
            userId: userId.toString(),
            planId: planId || 'standard_gold'
        }
    };

    const order = await razorpay.orders.create(options);

    // Look for existing pending payment record
    let payment = await Payment.findOne({
        user: userId,
        month: targetMonth,
        year: targetYear,
        status: 'pending'
    });

    if (payment) {
        payment.amount = amount;
        payment.transactionId = order.id;
        payment.razorpayOrderId = order.id;
        payment.method = 'razorpay';
        payment.currency = 'INR';
        await payment.save();
    } else {
        const existingRecord = await Payment.findOne({
            user: userId,
            month: targetMonth,
            year: targetYear
        });

        if (existingRecord && existingRecord.status !== 'paid') {
            existingRecord.amount = amount;
            existingRecord.status = 'pending';
            existingRecord.transactionId = order.id;
            existingRecord.razorpayOrderId = order.id;
            existingRecord.method = 'razorpay';
            existingRecord.currency = 'INR';
            existingRecord.rejectionReason = undefined;
            await existingRecord.save();
            payment = existingRecord;
        } else if (!existingRecord) {
            payment = await Payment.create({
                user: userId,
                amount: amount,
                currency: 'INR',
                month: targetMonth,
                year: targetYear,
                status: 'pending',
                method: 'razorpay',
                transactionId: order.id,
                razorpayOrderId: order.id
            });
        } else {
            // Already paid for targetMonth/Year (e.g. advance renewal), roll to next month
            const nextDate = addOneMonth(baseDate);
            targetMonth = nextDate.getMonth() + 1;
            targetYear = nextDate.getFullYear();

            payment = await Payment.create({
                user: userId,
                amount: amount,
                currency: 'INR',
                month: targetMonth,
                year: targetYear,
                status: 'pending',
                method: 'razorpay',
                transactionId: order.id,
                razorpayOrderId: order.id
            });
        }
    }

    return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_Tbwu0j2Qz6btzs',
        user: {
            name: user.name,
            email: user.email,
            phone: user.phone
        }
    };
};

const verifyRazorpayPayment = async (userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new Error('Payment verification parameters missing');
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'QG1MFgBU8xu5k7rlhkML6fMJ';
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        throw new Error('Invalid payment signature');
    }

    let payment = await Payment.findOne({
        $or: [
            { razorpayOrderId: razorpay_order_id },
            { transactionId: razorpay_order_id }
        ]
    });

    const user = await User.findById(userId || (payment && payment.user));
    if (!user) throw new Error('User not found');

    if (payment && payment.status === 'paid') {
        return {
            success: true,
            message: 'Payment already verified',
            payment,
            subscription: user.subscription
        };
    }

    const now = new Date();
    let startDate = now;
    let endDate = addOneMonth(now);

    if (user.subscription && user.subscription.plan === 'premium' && user.subscription.endDate) {
        const existingEnd = new Date(user.subscription.endDate);
        if (existingEnd > now) {
            startDate = user.subscription.startDate || now;
            endDate = addOneMonth(existingEnd);
        }
    }

    // Update user subscription immediately
    user.subscription = {
        plan: 'premium',
        status: 'active',
        startDate: startDate,
        endDate: endDate,
        lastPrice: payment ? payment.amount : undefined
    };
    await user.save();

    if (!payment) {
        payment = await Payment.create({
            user: user._id,
            amount: 500,
            currency: 'INR',
            month: startDate.getMonth() + 1,
            year: startDate.getFullYear(),
            status: 'paid',
            method: 'razorpay',
            transactionId: razorpay_order_id,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paidAt: now,
            startDate,
            endDate
        });
    } else {
        payment.status = 'paid';
        payment.paidAt = now;
        payment.startDate = startDate;
        payment.endDate = endDate;
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.method = 'razorpay';
        await payment.save();
    }

    return {
        success: true,
        payment,
        subscription: user.subscription
    };
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
    rejectPayment,
    createRazorpayOrder,
    verifyRazorpayPayment
};

