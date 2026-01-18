const mongoose = require('mongoose');

const scheduleSchema = mongoose.Schema(
    {
        workout: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Workout',
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // Required if not global
        },
        isGlobal: {
            type: Boolean,
            default: false,
        },
        isPublic: {
            type: Boolean,
            default: false,
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

// Compound index: prevent duplicate global workouts for the same day PER category (Public/Private)
scheduleSchema.index({ date: 1, isGlobal: 1, isPublic: 1 }, { unique: true, partialFilterExpression: { isGlobal: true } });

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
