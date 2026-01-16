const workoutService = require('./workout.service');

// @desc    Create a workout
// @route   POST /api/workouts
// @access  Private (Trainer/Admin)
const createWorkout = async (req, res) => {
    try {
        const workout = await workoutService.createWorkout(req.body, req.user._id);
        res.status(201).json(workout);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all workouts
// @route   GET /api/workouts
// @access  Private (Trainer/Admin)
const getWorkouts = async (req, res) => {
    try {
        const workouts = await workoutService.getWorkouts({});
        res.json(workouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my workouts
// @route   GET /api/workouts/my-plan
// @access  Private (User)
const getMyWorkouts = async (req, res) => {
    try {
        const workouts = await workoutService.getMyWorkouts(req.user._id);
        res.json(workouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get workout by ID
// @route   GET /api/workouts/:id
// @access  Private
const getWorkoutById = async (req, res) => {
    try {
        const workout = await workoutService.getWorkoutById(req.params.id);
        if (workout) {
            res.json(workout);
        } else {
            res.status(404).json({ message: 'Workout not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update workout
// @route   PUT /api/workouts/:id
// @access  Private (Trainer/Admin)
const updateWorkout = async (req, res) => {
    try {
        const workout = await workoutService.updateWorkout(req.params.id, req.body);
        res.json(workout);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete workout
// @route   DELETE /api/workouts/:id
// @access  Private (Trainer/Admin)
const deleteWorkout = async (req, res) => {
    try {
        await workoutService.deleteWorkout(req.params.id);
        res.json({ message: 'Workout removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createWorkout,
    getWorkouts,
    getMyWorkouts,
    getWorkoutById,
    updateWorkout,
    deleteWorkout
};
