const mongoose = require('mongoose');

const gymCheckInSchema = new mongoose.Schema(
    {
        gymId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Gym',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        sessionCost: {
            type: Number,
            required: true, // Snapshots the per-session rate (e.g. ₹100) at time of check-in
        },
        checkInDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        userLocation: {
            latitude: { type: Number },
            longitude: { type: Number },
        },
        settlementStatus: {
            type: String,
            enum: ['pending', 'settled'],
            default: 'pending',
            index: true,
        },
        settlementId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'GymSettlement',
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

gymCheckInSchema.index({ gymId: 1, createdAt: -1 });
gymCheckInSchema.index({ userId: 1, createdAt: -1 });
gymCheckInSchema.index({ settlementStatus: 1, gymId: 1, createdAt: -1 });

const GymCheckIn = mongoose.model('GymCheckIn', gymCheckInSchema);

module.exports = GymCheckIn;
