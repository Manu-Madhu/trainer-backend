const Workout = require('./workout.model');
const Schedule = require('../schedule/schedule.model');

const createWorkout = async (data, creatorId) => {
    const workout = new Workout({
        ...data,
        createdBy: creatorId
    });
    return await workout.save();
};

const getWorkouts = async (query) => {
    const { page = 1, limit = 10, search, level, isPublic } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
        filter.title = { $regex: search, $options: 'i' };
    }
    if (level) {
        filter.level = level;
    }
    if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
    }

    const workouts = await Workout.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Workout.countDocuments(filter);

    return {
        workouts,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
    };
};

const getWorkoutById = async (id) => {
    const workout = await Workout.findById(id).populate('assignedTo', 'name email role avatar');
    if (!workout) return null;

    const schedules = await Schedule.find({ workout: id })
        .populate('user', 'name email role avatar')
        .sort({ date: 1 });

    return { ...workout.toObject(), schedules };
};

const updateWorkout = async (id, data) => {
    return await Workout.findByIdAndUpdate(id, data, { new: true });
};

const deleteWorkout = async (id) => {
    // 1. Delete associated schedules first
    await Schedule.deleteMany({ workout: id });

    // 2. Delete the workout itself
    return await Workout.findByIdAndDelete(id);
};

const getMyWorkouts = async (userId) => {
    // Return workouts assigned to user OR public workouts
    return await Workout.find({
        $or: [
            { assignedTo: userId },
            { isPublic: true }
        ]
    });
};

module.exports = {
    createWorkout,
    getWorkouts,
    getWorkoutById,
    updateWorkout,
    deleteWorkout,
    getMyWorkouts
};
