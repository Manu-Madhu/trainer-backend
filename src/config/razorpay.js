const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Tbwu0j2Qz6btzs',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'QG1MFgBU8xu5k7rlhkML6fMJ',
});

module.exports = razorpayInstance;
