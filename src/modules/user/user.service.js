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
        // Set to end of the day to ensure the subscription is valid for the entire last day
        endDate.setHours(23, 59, 59, 999);

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

    // 1. Determine Subscription Status FIRST (to decide data visibility)
    let subscriptionStatus = user.subscription?.status || 'inactive';
    const subEndDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : null;
    let daysLeft = 0;

    if (user.subscription?.plan === 'premium') {
        if (subEndDate) {
            // Set End Date to End of Day for fair calculated expiry
            subEndDate.setHours(23, 59, 59, 999);

            const nowTime = new Date(); // Use actual current time for expiry check
            const diffTime = subEndDate.getTime() - nowTime.getTime();
            daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffTime <= 0) {
                subscriptionStatus = 'expired';
            } else if (daysLeft <= 2) {
                subscriptionStatus = 'expiring_soon';
            } else if (user.subscription.status === 'expired') {
                subscriptionStatus = 'expired';
            } else {
                subscriptionStatus = 'active';
            }
        }
    } else {
        subscriptionStatus = 'free';
    }

    // FIX: Force Timezone to India (Asia/Kolkata)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day').value);

    // Create a UTC date for the start of the India day (Midnight)
    const today = new Date(Date.UTC(year, month, day));
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 2. Get Today's Schedule (Workout & Meal Plan)
    const schedules = await Schedule.find({
        $or: [
            { user: userId },
            { isGlobal: true }
        ],
        date: { $gte: today, $lt: tomorrow }
    }).populate('workout').populate('mealPlan');

    let workoutToday = null;
    let mealPlanToday = null;

    // 3. Prioritize Assignments (If Expired -> Users get GLOBAL/Free data only)
    const useSpecific = subscriptionStatus !== 'expired';

    const specificSchedules = useSpecific
        ? schedules.filter(s => s.user && s.user.toString() === userId.toString())
        : [];

    const globalSchedules = schedules.filter(s => s.isGlobal);

    // Helper to resolve the correct schedule based on subscription status
    const resolveSchedule = (type) => {
        // 1. Try Specific (Personal) - Highest Priority
        const personal = specificSchedules.find(s => s[type]);
        if (personal) return personal;

        // 2. Try Global (Fallbacks)
        const relevantGlobals = globalSchedules.filter(s => s[type]);

        // Scenario A: Premium/Active User
        // Prefer "Premium Global" (isPublic: false), Fallback to "Free Global" (isPublic: true)
        if (subscriptionStatus === 'active' || subscriptionStatus === 'expiring_soon') {
            const premiumGlobal = relevantGlobals.find(s => s.isPublic === false);
            if (premiumGlobal) return premiumGlobal;

            // Fallback to free global if no premium global exists
            return relevantGlobals.find(s => s.isPublic === true);
        }

        // Scenario B: Free/Expired User
        // Can ONLY see "Free Global" (isPublic: true)
        return relevantGlobals.find(s => s.isPublic === true);
    };

    const activeWorkoutSchedule = resolveSchedule('workout');
    const activeMealSchedule = resolveSchedule('mealPlan');

    // 4. Get Daily Log
    const dailyLog = await DailyLog.findOne({
        user: userId,
        date: { $gte: today, $lt: tomorrow }
    });

    let kcalBurned = 0;
    let kcalEaten = 0;
    let targetBurn = 0;
    let targetEat = 0;

    if (activeWorkoutSchedule?.workout) {
        workoutToday = activeWorkoutSchedule.workout;
        targetBurn = workoutToday.caloriesBurned || 0;
    }

    if (activeMealSchedule?.mealPlan) {
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

    // 5. Get BMI
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
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Check if ANY record exists for this month/year to avoid Unique Key collision
    const existing = await Payment.findOne({
        user: userId,
        month: currentMonth,
        year: currentYear
    });

    if (existing) {
        if (existing.status === 'paid') {
            throw new Error('Subscription already active for this month.');
        }

        // If pending, failed, rejected -> update it to pending with new screenshot
        // This allows users to retry if their previous one was rejected or if they want to update the screenshot
        existing.status = 'pending';
        existing.screenshotUrl = screenshotUrl;
        existing.rejectionReason = undefined; // Clear previous rejection errors
        return await existing.save();
    }

    const payment = await Payment.create({
        user: userId,
        amount: 300,
        currency: 'INR',
        month: currentMonth,
        year: currentYear,
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
    requestPremium,
    checkAndExpireSubscription
};
