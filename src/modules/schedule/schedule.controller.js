const mongoose = require('mongoose');
const Schedule = require('./schedule.model');
const User = require('../user/user.model');
const Workout = require('../workout/workout.model');
const MealPlan = require('../meal/meal.model');

// @desc    Assign workout (Global or User specific)
// @route   POST /api/schedule
// @access  Admin
const createSchedule = async (req, res) => {
    try {
        const { workoutId, mealPlanId, date, userId, isGlobal } = req.body;

        if ((!workoutId && !mealPlanId) || !date) {
            return res.status(400).json({ message: 'Target (Workout/Meal) and Date are required' });
        }

        // Validate and Normalize Date
        // If it's a YYYY-MM-DD string, new Date(date) will be UTC midnight
        // If it's an ISO string, it will be exact UTC time
        const scheduleDate = new Date(date);
        scheduleDate.setUTCHours(0, 0, 0, 0); // Force to midnight UTC for storage consistency

        let targetPlan;
        if (workoutId) {
            targetPlan = await Workout.findById(workoutId);
        } else {
            targetPlan = await MealPlan.findById(mealPlanId);
        }

        if (!targetPlan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        console.log('Creating/Updating schedule:', {
            workoutId,
            mealPlanId,
            isGlobal,
            userId,
            date: scheduleDate.toISOString(),
            isPublic: targetPlan.isPublic
        });

        if (isGlobal) {
            // Check if global schedule already exists for this date and visibility
            const query = {
                date: scheduleDate,
                isGlobal: true
            };

            if (targetPlan.isPublic) {
                query.isPublic = true;
            } else {
                query.$or = [{ isPublic: false }, { isPublic: { $exists: false } }];
            }

            const existing = await Schedule.findOne(query);

            if (existing) {
                console.log('Updating existing global schedule:', existing._id);
                if (workoutId) {
                    existing.workout = workoutId;
                } else if (mealPlanId) {
                    existing.mealPlan = mealPlanId;
                }
                existing.isPublic = targetPlan.isPublic === true;
                existing.assignedBy = req.user._id;
                await existing.save();
                return res.status(200).json(existing);
            }

            const scheduleData = {
                date: scheduleDate,
                isGlobal: true,
                isPublic: targetPlan.isPublic === true,
                assignedBy: req.user._id
            };
            if (workoutId) scheduleData.workout = workoutId;
            else scheduleData.mealPlan = mealPlanId;

            const schedule = await Schedule.create(scheduleData);
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

            // Check if personal assignment already exists (UPSERT)
            const existing = await Schedule.findOne({
                date: scheduleDate,
                user: userId,
                isGlobal: false
            });

            if (existing) {
                if (workoutId) existing.workout = workoutId;
                else if (mealPlanId) existing.mealPlan = mealPlanId;

                existing.isPublic = targetPlan.isPublic === true;
                existing.assignedBy = req.user._id;
                await existing.save();
                return res.status(200).json(existing);
            }

            const scheduleData = {
                user: userId,
                date: scheduleDate,
                isGlobal: false,
                isPublic: targetPlan.isPublic === true,
                assignedBy: req.user._id
            };
            if (workoutId) scheduleData.workout = workoutId;
            else scheduleData.mealPlan = mealPlanId;

            const schedule = await Schedule.create(scheduleData);
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

        const schedules = await Schedule.find(query)
            .populate('workout')
            .populate('mealPlan')
            .populate('user', 'name email role subscription avatar')
            .sort({ date: 1 });
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
        const { workoutId, mealPlanId, dates, isPublic, startDate, endDate } = req.body;

        if ((!workoutId && !mealPlanId) || !dates || isPublic === undefined) {
            return res.status(400).json({ message: 'Plan ID, dates, and category are required' });
        }

        let targetPlan;
        if (workoutId) {
            targetPlan = await Workout.findById(workoutId);
        } else {
            targetPlan = await MealPlan.findById(mealPlanId);
        }

        if (!targetPlan) {
            return res.status(404).json({ message: 'Plan not found' });
        }

        const start = new Date(startDate || new Date());
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(endDate || new Date());
        end.setUTCHours(23, 59, 59, 999);

        // 1. Handle Unassignments (Surgical Nullification)
        const existingSchedules = await Schedule.find({
            [workoutId ? 'workout' : 'mealPlan']: (workoutId || mealPlanId),
            date: { $gte: start, $lte: end },
            isGlobal: true
        });

        const newDateStrings = dates.map(ds => new Date(ds).toISOString().split('T')[0]);

        for (const existing of existingSchedules) {
            const existingDateStr = existing.date.toISOString().split('T')[0];
            if (!newDateStrings.includes(existingDateStr)) {
                // IMPORTANT: Just null the field, don't delete doc if it has other category
                if (workoutId) existing.workout = undefined;
                else existing.mealPlan = undefined;

                if (!existing.workout && !existing.mealPlan) {
                    await existing.deleteOne();
                } else {
                    await existing.save();
                }
                console.log(`Removed ${workoutId ? 'workout' : 'meal'} plan from ${existingDateStr}`);
            }
        }

        // 2. Handle Assignments (Additive Upsert)
        for (const dateStr of dates) {
            const d = new Date(dateStr);
            d.setUTCHours(0, 0, 0, 0);

            await Schedule.findOneAndUpdate(
                {
                    date: d,
                    isGlobal: true,
                    isPublic: isPublic === true
                },
                {
                    [workoutId ? 'workout' : 'mealPlan']: (workoutId || mealPlanId),
                    isPublic: isPublic === true,
                    assignedBy: req.user._id
                },
                { upsert: true, new: true }
            );
        }

        console.log(`Surgically Synced Planner for ${targetPlan.title}: ${dates.length} days active.`);
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
// @desc    Get current user's schedule for a specific date (Priority: User > Global)
// @route   GET /api/schedule/my
// @access  Private (User)
// @desc    Get current user's schedule for a specific date (Priority: User > Global)
// @route   GET /api/schedule/my
// @access  Private (User)
const getMySchedule = async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;
        // User Premium Status
        const userIsPremium = req.user.subscription?.plan === 'premium';

        // -------------------------------------------------------------
        // NEW LOGIC: If Range Request (Frontend asks for 3 days usually)
        // -------------------------------------------------------------
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);

            // Fetch all potentially relevant schedules in one go
            const allSchedules = await Schedule.find({
                $or: [
                    { user: req.user._id, isGlobal: false }, // Personal
                    { isGlobal: true } // Global (both Public and Private)
                ],
                date: { $gte: start, $lte: end }
            })
                .populate('workout')
                .populate('mealPlan')
                .sort({ date: 1 });

            const result = [];
            const debugLog = [];

            // Iterate precisely day by day from start to end
            // Use a loop that increments the date object
            let currentLoopDate = new Date(start);
            while (currentLoopDate <= end) {
                // Normalize current day range
                const dayStart = new Date(currentLoopDate);
                dayStart.setUTCHours(0, 0, 0, 0);
                const dayEnd = new Date(currentLoopDate);
                dayEnd.setUTCHours(23, 59, 59, 999);

                // Find docs for this specific day
                const dayDocs = allSchedules.filter(s => {
                    const sDate = new Date(s.date);
                    return sDate >= dayStart && sDate <= dayEnd;
                });

                // Priority Logic:
                // 1. Specific Personal Assignment
                let chosenSchedule = dayDocs.find(s => s.user && s.user.toString() === req.user._id.toString());

                // 2. If no personal, look for Global
                if (!chosenSchedule) {
                    if (userIsPremium) {
                        // Premium User: Prefer "Premium Global" (isPublic=false), fallback to "Free Global" (isPublic=true)
                        // If there is a specific premium track set by admin (isPublic: false), take it.
                        chosenSchedule = dayDocs.find(s => s.isGlobal && s.isPublic === false);
                        if (!chosenSchedule) {
                            // Fallback to general public
                            chosenSchedule = dayDocs.find(s => s.isGlobal && s.isPublic === true);
                        }
                    } else {
                        // Free User: Can ONLY see "Free Global" (isPublic=true)
                        chosenSchedule = dayDocs.find(s => s.isGlobal && s.isPublic === true);
                    }
                }

                // Determine Locking Logic
                // Rule: If Free User -> Tomorrow (Future) is LOCKED.
                // We need to compare currentLoopDate to Actual "Today" (Server Time)
                const now = new Date();
                const todayMidnight = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
                const loopMidnight = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), dayStart.getUTCDate()));

                let isLocked = false;

                // If it's tomorrow (future) AND user is NOT premium => LOCKED
                if (loopMidnight > todayMidnight && !userIsPremium) {
                    isLocked = true;
                }

                // Construct Response Object for this Date
                const payload = {
                    date: dayStart.toISOString(),
                    _id: chosenSchedule?._id || null,
                    workout: null, // Default
                    mealPlan: null, // Default
                    status: 'active', // Placeholder
                    locked: isLocked
                };

                // If a schedule exists, populate fields
                if (chosenSchedule) {
                    // Check Completion Status based on DailyLog?
                    // The schedule object itself doesn't have 'completed'. 
                    // Usually we join with DailyLog, but for simplified MVP, let's assume valid data return.
                    // Frontend will handle completion status separately or we can add it here if we lookup Progress.
                    // For now, return the workout content.

                    // If LOCKED, we might want to hide details?
                    // User Request: "if free user then show the tomorroe workout locked... view it only"
                    // We will return the metadata (title, image) but maybe hide detailed exercises if we want strict security.
                    // But frontend will handle the "Lock" UI overlay.

                    if (chosenSchedule.workout) {
                        payload.workout = chosenSchedule.workout;
                    }
                    if (chosenSchedule.mealPlan) {
                        payload.mealPlan = chosenSchedule.mealPlan;
                    }
                }

                result.push(payload);

                // Increment Day
                currentLoopDate.setUTCDate(currentLoopDate.getUTCDate() + 1);
            }

            return res.json(result);
        }

        // -------------------------------------------------------------
        // FALLBACK: Old Single Date Logic (Backward Compatibility)
        // -------------------------------------------------------------
        const scheduleDate = date ? new Date(date) : new Date();
        scheduleDate.setUTCHours(0, 0, 0, 0);

        let schedule = await Schedule.findOne({
            user: req.user._id,
            date: scheduleDate,
            isGlobal: false
        }).populate('workout').populate('mealPlan');

        if (!schedule) {
            schedule = await Schedule.findOne({
                isGlobal: true,
                date: scheduleDate,
                isPublic: !userIsPremium
            }).populate('workout').populate('mealPlan');
        }

        res.json(schedule);

    } catch (error) {
        console.error('Get My Schedule Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get paginated user assignments for a specific workout
// @route   GET /api/schedule/workout/:workoutId/assignments
// @access  Admin
const getWorkoutAssignments = async (req, res) => {
    try {
        const { workoutId } = req.params;
        const { page = 1, limit = 5, search, from, to } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let pipeline = [
            {
                $match: {
                    workout: new mongoose.Types.ObjectId(workoutId),
                    isGlobal: false
                }
            }
        ];

        // Date Filter
        if (from || to) {
            let dateMatch = {};
            if (from) dateMatch.$gte = new Date(from);
            if (to) dateMatch.$lte = new Date(to);
            pipeline.push({ $match: { date: dateMatch } });
        }

        // Lookup user details
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user'
            }
        });
        pipeline.push({ $unwind: '$user' });

        // Search Filter (by User Name)
        if (search) {
            pipeline.push({
                $match: {
                    'user.name': { $regex: search, $options: 'i' }
                }
            });
        }

        // Get total count BEFORE skip/limit
        const totalPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await Schedule.aggregate(totalPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        // Sort and Paginate
        pipeline.push({ $sort: { date: -1 } });
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        const assignments = await Schedule.aggregate(pipeline);

        res.json({
            assignments,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            page: parseInt(page)
        });
    } catch (error) {
        console.error('Get Workout Assignments Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get assignments for a specific meal plan (Paginated)
 * @route   GET /api/schedule/meal/:mealId/assignments
 */
const getMealAssignments = async (req, res) => {
    try {
        const { mealId } = req.params;
        const { page = 1, limit = 10, search, from, to } = req.query;
        const skip = (page - 1) * limit;

        const pipeline = [
            {
                $match: {
                    mealPlan: new mongoose.Types.ObjectId(mealId),
                    isGlobal: false // Only user assignments
                }
            }
        ];

        // Date Range Filter
        if (from || to) {
            const dateFilter = {};
            if (from) dateFilter.$gte = new Date(from);
            if (to) dateFilter.$lte = new Date(to);
            pipeline.push({ $match: { date: dateFilter } });
        }

        // Lookup User details
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user'
            }
        });
        pipeline.push({ $unwind: '$user' });

        // Search Filter (by User Name)
        if (search) {
            pipeline.push({
                $match: {
                    'user.name': { $regex: search, $options: 'i' }
                }
            });
        }

        // Get total count
        const totalPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await Schedule.aggregate(totalPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        pipeline.push({ $sort: { date: -1 } });
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: parseInt(limit) });

        const assignments = await Schedule.aggregate(pipeline);

        res.json({
            assignments,
            total,
            pages: Math.ceil(total / parseInt(limit)),
            page: parseInt(page)
        });
    } catch (error) {
        console.error('Get Meal Assignments Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * @desc    Get daily schedule overview for admin (Global + Personal)
 * @route   GET /api/schedule/admin/daily
 * @access  Admin
 */
const getAdminDailySchedule = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const scheduleDate = new Date(date);
        scheduleDate.setUTCHours(0, 0, 0, 0);

        const schedules = await Schedule.find({ date: scheduleDate })
            .populate('workout')
            .populate('mealPlan')
            .populate('user', 'name email avatar role subscription');

        const result = {
            globalFree: schedules.find(s => s.isGlobal && s.isPublic),
            globalPaid: schedules.find(s => s.isGlobal && !s.isPublic),
            personalAssignments: schedules.filter(s => !s.isGlobal)
        };

        res.json(result);
    } catch (error) {
        console.error('Get Admin Daily Schedule Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createSchedule,
    getSchedules,
    deleteSchedule,
    getMySchedule,
    syncGlobalSchedules,
    getWorkoutAssignments,
    getMealAssignments,
    getAdminDailySchedule
};
