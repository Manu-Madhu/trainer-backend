const progressService = require('./progress.service');

// @desc    Log daily progress
// @route   POST /api/progress
// @access  Private (User)
const logProgress = async (req, res) => {
    try {
        const progress = await progressService.logProgress(req.body, req.user._id);
        res.status(201).json(progress);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get progress history
// @route   GET /api/progress/history
// @access  Private
const getProgressHistory = async (req, res) => {
    try {
        // If user is trainer/admin and querying for another user
        const userId = req.query.userId || req.user._id;

        // Validation: Trainer can only see their assigned users
        if (req.user.role === 'trainer' && userId !== req.user._id.toString()) {
            // Need verify assignment logic here ideally
        }

        const history = await progressService.getProgressHistory(userId);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add feedback to progress
// @route   POST /api/progress/feedback
// @access  Private (Trainer)
const addFeedback = async (req, res) => {
    try {
        const { progressId, feedback } = req.body;
        const result = await progressService.addFeedback(progressId, feedback);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getBmiLogs = async (req, res) => {
    try {
        const { userId } = req.params;
        const { from, to, page, limit } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;

        const logs = await progressService.getBmiLogs(userId, from, to, pageNum, limitNum);
        res.json(logs);
    } catch (error) {
        console.error('Error in getBmiLogs:', error);
        res.status(500).json({ message: error.message });
    }
};

const getDailyLogs = async (req, res) => {
    try {
        const { userId } = req.params;
        const { from, to, page, limit } = req.query;
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;

        const logs = await progressService.getDailyLogs(userId, from, to, pageNum, limitNum);
        res.json(logs);
    } catch (error) {
        console.error('Error in getDailyLogs:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Log daily activity
// @route   POST /api/progress/daily
// @access  Private (User)
const logDailyActivity = async (req, res) => {
    try {
        const log = await progressService.logDailyActivity(req.body, req.user._id);
        res.status(201).json(log);
    } catch (error) {
        res.status(400).json({ message: error.message });
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
