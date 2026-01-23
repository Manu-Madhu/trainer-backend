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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
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

    // 2. Get Daily Log
    const dailyLog = await DailyLog.findOne({
        user: userId,
        date: { $gte: today, $lt: tomorrow }
    });

    let kcalBurned = 0;
    let kcalEaten = 0;
    let targetBurn = 0;
    let targetEat = 0;

    for (const s of schedules) {
        if (s.workout) {
            workoutToday = s.workout;
            targetBurn += (workoutToday.caloriesBurned || 0);
        }
        if (s.mealPlan) {
            mealPlanToday = s.mealPlan;
            if (mealPlanToday.meals) {
                mealPlanToday.meals.forEach(m => {
                    if (m.totalCalories) targetEat += m.totalCalories;
                });
            }
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

    return {
        user,
        stats: {
            burned: { current: kcalBurned, target: targetBurn },
            eaten: { current: kcalEaten, target: targetEat },
            bmi: bmi ? parseFloat(bmi.toFixed(1)) : 0
        },
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
