const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: 'INR',
        },
        month: {
            type: Number, // 1-12
            required: true,
        },
        year: {
            type: Number, // e.g. 2024
            required: true,
        },
        status: {
            type: String,
            enum: ['paid', 'pending', 'failed', 'refunded'],
            default: 'pending',
        },
        method: {
            type: String, // 'stripe', 'paypal', 'manual', 'cash'
        },
        transactionId: {
            type: String,
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'yearly'],
            default: 'monthly',
        },
        paidAt: {
            type: Date,
        },
        startDate: {
            type: Date,
        },
        endDate: {
            type: Date,
        },
        notes: {
            type: String,
        },
        screenshotUrl: {
            type: String, // URL of the payment screenshot
        },
        rejectionReason: {
            type: String
        }
    },
    {
        timestamps: true,
    }
);

// Prevent duplicate payments for the same user, month, and year
paymentSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
