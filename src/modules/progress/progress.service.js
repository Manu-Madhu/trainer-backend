const Progress = require('./progress.model');

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

module.exports = {
    logProgress,
    getProgressHistory,
    addFeedback
};
