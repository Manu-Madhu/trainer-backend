const express = require('express');
const router = express.Router();
const workoutController = require('./workout.controller');
const { protect, trainer } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, trainer, workoutController.getWorkouts)
    .post(protect, trainer, workoutController.createWorkout);

router.get('/my-plan', protect, workoutController.getMyWorkouts);

router.route('/:id')
    .get(protect, workoutController.getWorkoutById)
    .put(protect, trainer, workoutController.updateWorkout)
    .delete(protect, trainer, workoutController.deleteWorkout);

module.exports = router;
