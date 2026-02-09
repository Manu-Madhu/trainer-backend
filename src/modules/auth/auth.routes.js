const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

const { protect } = require('../../middleware/authMiddleware');

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/verify-otp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/reset-password', authController.getResetPasswordPageController); // New SSR page
router.post('/reset-password-submit', authController.resetPasswordSubmit); // New SSR submit
router.get('/me', protect, authController.getMe);


module.exports = router;
