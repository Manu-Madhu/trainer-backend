const authService = require('./auth.service');
const { getResetPasswordPage, getSuccessPage, getErrorPage } = require('../../utils/htmlTemplates');

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
        const fs = require('fs');
        try { fs.appendFileSync('error.log', `[${new Date().toISOString()}] loginUser Error: ${error.stack}\n`); } catch (e) { }
        console.error(error);
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



// @desc    Forgot Password - Send Email Link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await authService.forgotPassword(email);
        res.json(result);
    } catch (error) {
        // Return 200 even if user not found for security? 
        // User asked to check if existing one.
        // Current service throws error if not found.
        res.status(404).json({ message: error.message });
    }
};

// @desc    Reset Password (API)
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    const { email, otp, token, newPassword } = req.body;
    // Accept either otp or token
    const verificationCode = otp || token;

    try {
        const result = await authService.resetPassword(email, verificationCode, newPassword);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get Reset Password Page (SSR)
// @route   GET /api/auth/reset-password
// @access  Public
const getResetPasswordPageController = async (req, res) => {
    const { email, token } = req.query;

    if (!email || !token) {
        return res.send(getErrorPage('Invalid Link'));
    }

    try {
        const isValid = await authService.verifyResetToken(email, token);
        if (isValid) {
            res.send(getResetPasswordPage(token, email));
        } else {
            res.send(getErrorPage('Invalid or expired reset link.'));
        }
    } catch (error) {
        res.send(getErrorPage(error.message));
    }
};

// @desc    Submit Reset Password Form (SSR)
// @route   POST /api/auth/reset-password-submit
// @access  Public
const resetPasswordSubmit = async (req, res) => {
    const { email, token, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.send(getResetPasswordPage(token, email, 'Passwords do not match'));
    }

    try {
        await authService.resetPassword(email, token, password);
        res.send(getSuccessPage('Your password has been reset successfully.'));
    } catch (error) {
        res.send(getResetPasswordPage(token, email, error.message));
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            avatar: req.user.avatar,
            subscription: req.user.subscription,
            height: req.user.height,
            currentWeight: req.user.currentWeight,
            targetWeight: req.user.targetWeight,
            bmi: req.user.bmi,
            gender: req.user.gender,
            age: req.user.age,
            fitnessGoal: req.user.fitnessGoal,
            activityLevel: req.user.activityLevel,
        };
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await authService.resendOtp(email);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    verifyOtp,
    forgotPassword,
    resetPassword,
    getResetPasswordPageController,
    resetPasswordSubmit,
    getMe,
    resendOtp
};
