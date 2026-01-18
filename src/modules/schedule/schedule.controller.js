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

        // Validate and Normalize Date
        // If it's a YYYY-MM-DD string, new Date(date) will be UTC midnight
        // If it's an ISO string, it will be exact UTC time
        const scheduleDate = new Date(date);
        scheduleDate.setUTCHours(0, 0, 0, 0); // Force to midnight UTC for storage consistency

        const workout = await Workout.findById(workoutId);
        if (!workout) {
            console.warn('Workout not found:', workoutId);
            return res.status(404).json({ message: 'Workout not found' });
        }

        console.log('Creating/Updating schedule:', {
            workoutId,
            isGlobal,
            userId,
            date: scheduleDate.toISOString(),
            workoutIsPublic: workout.isPublic
        });

        if (isGlobal) {
            // Check if global workout already exists for this date and visibility (Public vs Private)
            // Handle legacy documents that might lack the isPublic field
            const query = {
                date: scheduleDate,
                isGlobal: true
            };

            if (workout.isPublic) {
                query.isPublic = true;
            } else {
                // If it's a private workout (for paid users), it might match existing docs with isPublic: false OR missing field
                query.$or = [{ isPublic: false }, { isPublic: { $exists: false } }];
            }

            const existing = await Schedule.findOne(query);

            if (existing) {
                console.log('Updating existing global schedule:', existing._id);
                existing.workout = workoutId;
                existing.isPublic = workout.isPublic === true; // Normalize on update
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

            // Check if personal assignment already exists (UPSERT)
            const existing = await Schedule.findOne({
                date: scheduleDate,
                user: userId,
                isGlobal: false
            });

            if (existing) {
                console.log('Updating existing personal schedule for user:', userId);
                existing.workout = workoutId;
                existing.isPublic = workout.isPublic === true; // Keep metadata updated
                existing.assignedBy = req.user._id;
                await existing.save();
                return res.status(200).json(existing);
            }

            const schedule = await Schedule.create({
                workout: workoutId,
                date: scheduleDate,
                user: userId,
                isGlobal: false,
                isPublic: workout.isPublic === true,
                assignedBy: req.user._id
            });
            return res.status(201).json(schedule);
        }

    } catch (error) {
        console.error('Create Schedule Error:', {
            message: error.message,
            code: error.code,
            body: req.body
        });
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

// @desc    Sync global schedules for a date range (Delete existing and create new)
// @route   POST /api/schedule/sync-global
// @access  Admin
const syncGlobalSchedules = async (req, res) => {
    try {
        const { workoutId, dates, isPublic, startDate, endDate } = req.body;

        if (!workoutId || !dates || isPublic === undefined) {
            return res.status(400).json({ message: 'Workout, dates, and category are required' });
        }

        const workout = await Workout.findById(workoutId);
        if (!workout) {
            return res.status(404).json({ message: 'Workout not found' });
        }

        // Normalize range to full days UTC
        const start = new Date(startDate || new Date());
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate || new Date());
        end.setUTCHours(23, 59, 59, 999);

        // 1. Handle Unassignments (Surgical Delete)
        // Find all dates where THIS workout is currently assigned globally in this range
        const existingSchedules = await Schedule.find({
            workout: workoutId,
            date: { $gte: start, $lte: end },
            isGlobal: true
        });

        const newDateStrings = dates.map(ds => new Date(ds).toISOString().split('T')[0]);

        for (const existing of existingSchedules) {
            const existingDateStr = existing.date.toISOString().split('T')[0];
            if (!newDateStrings.includes(existingDateStr)) {
                await existing.deleteOne();
                console.log(`Removed ${workout.title} from ${existingDateStr}`);
            }
        }

        // 2. Handle Assignments (Upsert)
        for (const dateStr of dates) {
            const d = new Date(dateStr);
            d.setUTCHours(0, 0, 0, 0);

            // This replaces whatever workout was presiding on that date/category
            await Schedule.findOneAndUpdate(
                {
                    date: d,
                    isGlobal: true,
                    isPublic: isPublic === true
                },
                {
                    workout: workoutId,
                    isPublic: isPublic === true,
                    assignedBy: req.user._id
                },
                { upsert: true, new: true }
            );
        }

        console.log(`Surgically Synced Planner for ${workout.title}: ${dates.length} days active.`);
        res.status(200).json({ message: 'Global schedule synchronized successfully' });
    } catch (error) {
        console.error('Sync Global Schedules Error:', error);
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

// @desc    Get current user's schedule for a specific date (Priority: User > Global)
// @route   GET /api/schedule/my
// @access  Private (User)
const getMySchedule = async (req, res) => {
    try {
        const { date } = req.query;
        const scheduleDate = date ? new Date(date) : new Date();
        scheduleDate.setHours(0, 0, 0, 0);

        // 1. Check for Personal Assignment (Highest Priority)
        let schedule = await Schedule.findOne({
            user: req.user._id,
            date: scheduleDate,
            isGlobal: false
        }).populate('workout');

        if (!schedule) {
            // 2. Check for Global Assignment (Tier based)
            // Free user -> isPublic: true
            // Premium user -> isPublic: false
            const userIsPremium = req.user.subscription?.plan === 'premium';

            schedule = await Schedule.findOne({
                isGlobal: true,
                date: scheduleDate,
                isPublic: !userIsPremium // if premium, look for isPublic: false (Private)
            }).populate('workout');
        }

        res.json(schedule);
    } catch (error) {
        console.error('Get My Schedule Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createSchedule,
    getSchedules,
    deleteSchedule,
    getMySchedule,
    syncGlobalSchedules
};
