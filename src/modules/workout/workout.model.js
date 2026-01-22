const mongoose = require('mongoose');

const exerciseSchema = mongoose.Schema({
    name: { type: String, required: true },
    sets: { type: Number, default: 3 },
    reps: { type: Number, default: 10 },
    duration: { type: Number }, // in seconds (for cardio/timed)
    caloriesBurned: { type: Number, default: 0 }, // Estimated calories burned
    rest: { type: Number, default: 60 }, // in seconds
    media: [{
        type: { type: String, enum: ['image', 'video', 'gif'] },
        url: { type: String },
        name: { type: String }
    }],
    setType: {
        type: String,
        enum: ['Normal', 'Super Set', 'Drop Set', 'Circuit', 'Giant Set', 'Failure', 'Warm-up'],
        default: 'Normal'
    },
    instructions: { type: String },
});

const workoutSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner',
        },
        exercises: [exerciseSchema],
        media: [{
            type: { type: String, enum: ['image', 'video', 'gif'] },
            url: { type: String },
            name: { type: String }
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assignedTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        isPublic: {
            type: Boolean,
            default: false, // If true, available to all free users as sample
        }
    },
    {
        timestamps: true,
    }
);

const Workout = mongoose.model('Workout', workoutSchema);

module.exports = Workout;
