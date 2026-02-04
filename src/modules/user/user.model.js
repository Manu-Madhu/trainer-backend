const mongoose = require('mongoose');

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['admin', 'trainer', 'user'],
            default: 'user',
        },
        // Profile Details
        avatar: {
            type: String, // URL to image
        },
        height: {
            type: Number, // in cm
        },
        currentWeight: {
            type: Number, // in kg
        },
        targetWeight: {
            type: Number, // in kg
        },
        bmi: {
            type: Number,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
        },
        age: {
            type: Number,
        },
        fitnessGoal: {
            type: String, // 'lose_weight', 'build_muscle', etc.
        },
        activityLevel: {
            type: String, // 'sedentary', 'active', 'gym', etc.
            enum: ['sedentary', 'active', 'gym', 'athlete', "home", "session"],
            default: 'sedentary'
        },
        medicalConditions: {
            type: [String],
            default: []
        },

        // Subscription
        subscription: {
            plan: {
                type: String,
                enum: ['free', 'premium'],
                default: 'free',
            },
            status: {
                type: String,
                enum: ['active', 'inactive', 'expired'],
                default: 'active',
            },
            startDate: Date,
            endDate: Date,
        },

        // Trainer Specific
        specialization: {
            type: String,
        },

        // User Specific (Relation)
        assignedTrainer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        // Auth Verification
        isVerified: {
            type: Boolean,
            default: false,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },
        otp: {
            type: String,
        },
        otpExpires: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
