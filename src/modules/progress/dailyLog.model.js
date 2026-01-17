const mongoose = require('mongoose');

const dailyLogSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        mealsCompleted: {
            type: Boolean,
            default: false,
        },
        workoutCompleted: {
            type: Boolean,
            default: false,
        },
        checkIn: {
            type: Boolean,
            default: false,
        },
        waterIntake: {
            type: Number, // in liters or cups
            default: 0
        },
        notes: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);

module.exports = DailyLog;
