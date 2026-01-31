const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
        default: 'payment_config'
    },
    upiId: {
        type: String,
        required: true,
        default: 'ajithrajsree-1@oksbi'
    },
    amount: {
        type: Number,
        required: true,
        default: 500
    }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
