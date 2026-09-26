const mongoose = require('mongoose');

const gymSettlementSchema = new mongoose.Schema(
    {
        gymId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Gym',
            required: true,
            index: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
        },
        totalCheckIns: {
            type: Number,
            required: true,
            default: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        payoutStatus: {
            type: String,
            enum: ['pending', 'processed', 'paid'],
            default: 'pending',
            index: true,
        },
        paidAt: {
            type: Date,
        },
        transactionReference: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

gymSettlementSchema.index({ gymId: 1, month: 1, year: 1 }, { unique: true });

const GymSettlement = mongoose.model('GymSettlement', gymSettlementSchema);

module.exports = GymSettlement;
