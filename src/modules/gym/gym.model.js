const mongoose = require('mongoose');

const gymSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        gymName: {
            type: String,
            required: [true, 'Gym name is required'],
            trim: true,
        },
        tagline: {
            type: String,
            trim: true,
        },
        contactPerson: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
        },
        address: {
            street: { type: String, default: '' },
            city: { type: String, required: true },
            state: { type: String, default: '' },
            pincode: { type: String, default: '' },
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
                default: [0, 0],
            },
        },
        perSessionCost: {
            type: Number,
            required: true,
            default: 100, // Per session payout amount in INR
        },
        totalSquareFeet: {
            type: Number,
            default: 0,
        },
        totalEquipments: {
            type: Number,
            default: 0,
        },
        totalTrainers: {
            type: Number,
            default: 0,
        },
        qrCodeToken: {
            type: String,
            required: true,
            unique: true,
        },
        amenities: [
            {
                type: String,
                trim: true,
            },
        ],
        photos: [
            {
                type: String,
            },
        ],
        videoUrl: {
            type: String,
            default: '',
        },
        videos: [
            {
                type: String,
            },
        ],
        openingHours: {
            weekdays: { type: String, default: '06:00 AM - 10:00 PM' },
            weekends: { type: String, default: '07:00 AM - 08:00 PM' },
        },
        bankDetails: {
            accountHolderName: { type: String, default: '' },
            accountNumber: { type: String, default: '' },
            ifscCode: { type: String, default: '' },
            upiId: { type: String, default: '' },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Geo-spatial index for location queries ($near / $geoWithin)
gymSchema.index({ location: '2dsphere' });

const Gym = mongoose.model('Gym', gymSchema);

module.exports = Gym;
