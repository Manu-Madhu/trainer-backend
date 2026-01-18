const Schedule = require('./schedule.model');
const User = require('../user/user.model');

// @desc    Assign workout (Global or User specific)
// @route   POST /api/schedule
// @access  Admin
const createSchedule = async (req, res) => {
    try {
        const { workoutId, date, userId, isGlobal } = req.body;

        if (!workoutId || !date) {
            return res.status(400).json({ message: 'Workout and Date are required' });
        }

        // Validate Date (simple check)
        const scheduleDate = new Date(date);
        scheduleDate.setHours(0, 0, 0, 0); // Normalize to start of day

        if (isGlobal) {
            // Check if global workout already exists for this date
            const existing = await Schedule.findOne({ date: scheduleDate, isGlobal: true });
            if (existing) {
                // Option: Overwrite or Error. Let's overwrite for flexibility.
                existing.workout = workoutId;
                existing.assignedBy = req.user._id;
                await existing.save();
                return res.status(200).json(existing);
            }

            const schedule = await Schedule.create({
                workout: workoutId,
                date: scheduleDate,
                isGlobal: true,
                assignedBy: req.user._id
            });
            return res.status(201).json(schedule);
        } else {
            // User Specific
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required for non-global assignment' });
            }

            // check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Check if already assigned? Maybe allow multiple? Let's allow multiple for now unless specified.
            const schedule = await Schedule.create({
                workout: workoutId,
                date: scheduleDate,
                user: userId,
                isGlobal: false,
                assignedBy: req.user._id
            });
            return res.status(201).json(schedule);
        }

    } catch (error) {
        console.error('Create Schedule Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get schedules (Optional, for checking)
// @route   GET /api/schedule
// @access  Admin/Private
const getSchedules = async (req, res) => {
    try {
        const { from, to } = req.query;
        // Basic filter
        const query = {};
        if (from && to) {
            query.date = { $gte: new Date(from), $lte: new Date(to) };
        }

        const schedules = await Schedule.find(query).populate('workout').populate('user', 'name email');
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createSchedule,
    getSchedules
};
