const Schedule = require('./schedule.model');
const User = require('../user/user.model');
const Workout = require('../workout/workout.model');

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

        const workout = await Workout.findById(workoutId);
        if (!workout) {
            console.warn('Workout not found:', workoutId);
            return res.status(404).json({ message: 'Workout not found' });
        }

        console.log('Creating schedule:', {
            workoutId,
            isGlobal,
            userId,
            date: scheduleDate.toISOString(),
            workoutIsPublic: workout.isPublic
        });

        if (isGlobal) {
            // Check if global workout already exists for this date and visibility (Public vs Private)
            const existing = await Schedule.findOne({
                date: scheduleDate,
                isGlobal: true,
                isPublic: workout.isPublic === true // Ensure boolean
            });

            if (existing) {
                console.log('Updating existing global schedule:', existing._id);
                existing.workout = workoutId;
                existing.assignedBy = req.user._id;
                await existing.save();
                return res.status(200).json(existing);
            }

            const schedule = await Schedule.create({
                workout: workoutId,
                date: scheduleDate,
                isGlobal: true,
                isPublic: workout.isPublic === true,
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
                console.warn('User not found:', userId);
                return res.status(404).json({ message: 'User not found' });
            }

            const schedule = await Schedule.create({
                workout: workoutId,
                date: scheduleDate,
                user: userId,
                isGlobal: false,
                isPublic: workout.isPublic, // Store for easy filtering
                assignedBy: req.user._id
            });
            return res.status(201).json(schedule);
        }

    } catch (error) {
        console.error('Create Schedule Error Details:', {
            message: error.message,
            stack: error.stack,
            body: req.body
        });
        res.status(500).json({
            message: 'Server Error',
            error: error.message // Temporarily return error message for debugging
        });
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

// @desc    Delete schedule
// @route   DELETE /api/schedule/:id
// @access  Admin
const deleteSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);

        if (!schedule) {
            return res.status(404).json({ message: 'Schedule not found' });
        }

        await schedule.deleteOne();
        res.json({ message: 'Schedule removed' });
    } catch (error) {
        console.error('Delete Schedule Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createSchedule,
    getSchedules,
    deleteSchedule
};
