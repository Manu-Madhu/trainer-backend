const mongoose = require('mongoose');

const progressSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        weight: {
            type: Number, // in kg
        },
        measurements: {
            chest: Number,
            waist: Number,
            hips: Number,
            arms: Number,
            thighs: Number,
        },
        photos: [
            {
                url: String,
                type: { type: String, enum: ['front', 'back', 'side'] },
            }
        ],
        trainerFeedback: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;
