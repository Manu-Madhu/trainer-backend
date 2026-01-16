const authService = require('./auth.service');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const user = await authService.register(req.body);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await authService.login(email, password);
        res.json(user);
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const result = await authService.verifyOtp(email, otp);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    verifyOtp
};
