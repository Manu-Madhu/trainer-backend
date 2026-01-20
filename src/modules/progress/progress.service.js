const Progress = require('./progress.model');
const DailyLog = require('./dailyLog.model');
const User = require('../user/user.model');

const logProgress = async (data, userId) => {
    const progress = new Progress({
        ...data,
        user: userId
    });
    return await progress.save();
};

const getProgressHistory = async (userId) => {
    return await Progress.find({ user: userId }).sort({ date: -1 });
};

const addFeedback = async (id, feedback) => {
    return await Progress.findByIdAndUpdate(id, { trainerFeedback: feedback }, { new: true });
};



const getBmiLogs = async (userId, from, to, page = 1, limit = 10) => {
    // Build date filter
    const dateFilter = { user: userId };
    if (from || to) {
        dateFilter.date = {};
        if (from) dateFilter.date.$gte = new Date(from);
        if (to) dateFilter.date.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select('height');
    const logs = await Progress.find(dateFilter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);


    const heightInMeters = (user && user.height) ? user.height / 100 : null;

    return logs.map(log => {
        let bmi = null;
        if (log.weight && heightInMeters) {
            bmi = log.weight / (heightInMeters * heightInMeters);
        }
        return {
            _id: log._id,
            date: log.date,
            weight: log.weight,
            bmi: bmi ? parseFloat(bmi.toFixed(1)) : null,
            createdAt: log.createdAt
        };
    });
};


const getDailyLogs = async (userId, from, to, page = 1, limit = 10) => {
    const dateFilter = { user: userId };
    if (from || to) {
        dateFilter.date = {};
        if (from) dateFilter.date.$gte = new Date(from);
        if (to) dateFilter.date.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    return await DailyLog.find(dateFilter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit);
};

const logDailyActivity = async (data, userId) => {
    // Check if log exists for this date (ignoring time)
    const startOfDay = new Date(data.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(data.date);
    endOfDay.setHours(23, 59, 59, 999);

    let log = await DailyLog.findOne({
        user: userId,
        date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (log) {
        // Update existing
        Object.assign(log, data);
        return await log.save();
    } else {
        // Create new
        log = new DailyLog({
            ...data,
            user: userId
        });
        return await log.save();
    }
};

module.exports = {
    logProgress,
    getProgressHistory,
    addFeedback,
    getBmiLogs,
    getDailyLogs,
    logDailyActivity
};

