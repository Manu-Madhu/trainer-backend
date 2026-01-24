const userRepository = require('./user.repository');
const Schedule = require('../schedule/schedule.model');
const DailyLog = require('../progress/dailyLog.model');
const Progress = require('../progress/progress.model');
const Payment = require('../subscription/payment.model');
const bcrypt = require('bcryptjs');
const sendEmail = require('../../utils/sendEmail');
const { getWelcomeEmailTemplate } = require('../../utils/emailTemplates');

const getAllUsers = async (query = {}) => {
    const filter = {};
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    if (query.role) {
        filter.role = query.role;
    }
    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: 'i' } },
            { email: { $regex: query.search, $options: 'i' } }
        ];
    }
    if (query.startDate && query.endDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
    } else if (query.date) {
        // Assuming date comes as YYYY-MM-DD
        const startOfDay = new Date(query.date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(query.date);
        endOfDay.setHours(23, 59, 59, 999);

        filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    return await userRepository.findAllUsers(filter, { skip, limit });
};

const checkAndExpireSubscription = async (user) => {
    // Only check if premium and has end date
    if (user.subscription && user.subscription.plan === 'premium' && user.subscription.endDate) {
        const now = new Date();
        const endDate = new Date(user.subscription.endDate);

        // Check if strictly past the end date
        if (now > endDate && user.subscription.status !== 'expired') {
            // Update DB
            await userRepository.updateUser(user._id, {
                'subscription.status': 'expired'
            });
            // Update in-memory object to reflect change immediately
            user.subscription.status = 'expired';
            return true;
        }
    }
    return false;
};

const getUserById = async (userId) => {
    return await userRepository.findUserById(userId);
};

const registerUser = async (userData) => {
    // Check if user exists
    const userExists = await userRepository.findUserByEmail(userData.email);
    if (userExists) {
        throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Prepare user data with hashed password and auto-verification
    const userToCreate = {
        ...userData,
        password: hashedPassword,
        isVerified: true, // Admin created users are auto-verified
        otp: undefined,
        otpExpires: undefined
    };

    const user = await userRepository.createUser(userToCreate);

    // Send Welcome Email
    try {
        const message = getWelcomeEmailTemplate(user.name, userData.email, userData.password);

        await sendEmail({
            email: user.email,
            subject: 'Welcome to Trainer - Account Credentials',
            message
        });
    } catch (error) {
        console.error('Could not send welcome email', error);
        // Don't fail the process, just log it. Admin knows the password.
    }

    return user;
};

const toggleUserBlockStatus = async (userId) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return await userRepository.updateUser(userId, { isBlocked: !user.isBlocked });
};

const deleteUser = async (userId) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return await userRepository.deleteUser(userId);
};

const updateUser = async (userId, updateData) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return await userRepository.updateUser(userId, updateData);
};

const getHomeData = async (userId) => {
    const user = await userRepository.findUserById(userId);
    if (!user) throw new Error('User not found');

    // AUTO-UPDATE: Check if subscription expired
    await checkAndExpireSubscription(user);

    // FIX: Force Timezone to India (Asia/Kolkata)
    // Server might be in UTC. 4 AM IST = 10:30 PM Previous Day UTC.
    // We must ensure 'today' represents the date in India.
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value) - 1; // Months are 0-indexed
    const day = parseInt(parts.find(p => p.type === 'day').value);

    // Create a UTC date for the start of the India day (Midnight)
    const today = new Date(Date.UTC(year, month, day));

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Get Today's Schedule (Workout & Meal Plan)
    const schedules = await Schedule.find({
        $or: [
            { user: userId },
            { isGlobal: true }
        ],
        date: { $gte: today, $lt: tomorrow }
    }).populate('workout').populate('mealPlan');

    let workoutToday = null;
    let mealPlanToday = null;

    // 2. Prioritize Assignments (User Specific > Global)
    const specificSchedules = schedules.filter(s => s.user && s.user.toString() === userId.toString());
    const globalSchedules = schedules.filter(s => s.isGlobal);

    const activeWorkoutSchedule = specificSchedules.find(s => s.workout) || globalSchedules.find(s => s.workout);
    const activeMealSchedule = specificSchedules.find(s => s.mealPlan) || globalSchedules.find(s => s.mealPlan);

    // 3. Get Daily Log
    const dailyLog = await DailyLog.findOne({
        user: userId,
        date: { $gte: today, $lt: tomorrow }
    });

    let kcalBurned = 0;
    let kcalEaten = 0;
    let targetBurn = 0;
    let targetEat = 0;

    if (activeWorkoutSchedule) {
        workoutToday = activeWorkoutSchedule.workout;
        targetBurn = workoutToday.caloriesBurned || 0;
    }

    if (activeMealSchedule) {
        mealPlanToday = activeMealSchedule.mealPlan;
        if (mealPlanToday.meals) {
            mealPlanToday.meals.forEach(m => {
                if (m.totalCalories) targetEat += m.totalCalories;
            });
        }
    }

    if (dailyLog?.workoutCompleted) {
        kcalBurned = targetBurn;
    }

    if (dailyLog?.mealsCompleted) {
        kcalEaten = targetEat;
    }

    // 3. Get BMI
    const lastProgress = await Progress.findOne({ user: userId }).sort({ date: -1 });
    let currentWeight = user.currentWeight;
    if (lastProgress && lastProgress.weight) {
        currentWeight = lastProgress.weight;
    }

    let bmi = user.bmi || 0;
    if (user.height && currentWeight) {
        const heightInM = user.height / 100;
        bmi = currentWeight / (heightInM * heightInM);
    }

    // 4. Check Subscription Status
    let subscriptionStatus = user.subscription?.status || 'inactive';
    const subEndDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : null;
    let daysLeft = 0;

    if (user.subscription?.plan === 'premium') {
        if (subEndDate) {
            const nowTime = new Date(); // Use actual current time for expiry check, not just date
            const diffTime = subEndDate.getTime() - nowTime.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffTime <= 0) {
                subscriptionStatus = 'expired';
            } else if (daysLeft <= 2) {
                subscriptionStatus = 'expiring_soon';
            } else if (user.subscription.status === 'expired') {
                // Fallback if checkAndExpireSubscription already set it but dates are weirdly aligned (unlikely with > check)
                subscriptionStatus = 'expired';
            } else {
                subscriptionStatus = 'active';
            }
        }
    } else {
        subscriptionStatus = 'free';
    }

    // RESTRICT CONTENT IF EXPIRED
    if (subscriptionStatus === 'expired') {
        workoutToday = null;
        mealPlanToday = null;
    }

    return {
        user,
        stats: {
            burned: { current: kcalBurned, target: targetBurn },
            eaten: { current: kcalEaten, target: targetEat },
            bmi: bmi ? parseFloat(bmi.toFixed(1)) : 0
        },
        subscriptionStatus,
        daysLeft,
        workoutToday,
        mealPlan: mealPlanToday
    };
};

const requestPremium = async (userId, screenshotUrl) => {
    // Check if pending request exists
    const existing = await Payment.findOne({ user: userId, status: 'pending' });
    if (existing) {
        existing.screenshotUrl = screenshotUrl;
        return await existing.save();
    }

    const payment = await Payment.create({
        user: userId,
        amount: 300,
        currency: 'INR',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        status: 'pending',
        method: 'manual_upi',
        screenshotUrl
    });
    return payment;
};

module.exports = {
    getAllUsers,
    getUserById,
    registerUser,
    toggleUserBlockStatus,
    deleteUser,
    deleteUser,
    updateUser,
    getHomeData,
    requestPremium
};
