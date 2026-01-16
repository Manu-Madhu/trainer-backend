const Workout = require('./workout.model');

const createWorkout = async (data, creatorId) => {
    const workout = new Workout({
        ...data,
        createdBy: creatorId
    });
    return await workout.save();
};

const getWorkouts = async (query) => {
    return await Workout.find(query);
};

const getWorkoutById = async (id) => {
    return await Workout.findById(id);
};

const updateWorkout = async (id, data) => {
    return await Workout.findByIdAndUpdate(id, data, { new: true });
};

const deleteWorkout = async (id) => {
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
