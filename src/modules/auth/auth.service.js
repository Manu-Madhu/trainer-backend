const User = require('../user/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../../utils/sendEmail');
const { getOtpEmailTemplate, getResetPasswordEmailTemplate, getForgotPasswordOtpTemplate } = require('../../utils/emailTemplates');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const register = async (userData) => {
    // Destructure all possible fields, including mapped ones
    const { name, email, password, role, phone, height, weight, currentWeight, targetWeight, bmi, gender, age, goal, fitnessGoal, activityLevel, workoutType, medicalConditions, injuries } = userData;

    const userExists = await User.findOne({ email });

    if (userExists) {
        throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Mock OTP for now
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    // Normalize Data
    const normalizedGender = gender ? gender.toLowerCase() : undefined;
    const finalCurrentWeight = currentWeight || weight;
    const finalFitnessGoal = fitnessGoal || goal;
    let finalInjuries = medicalConditions || injuries;

    // Parse injuries if it's a stringified JSON array
    if (typeof finalInjuries === 'string') {
        try {
            finalInjuries = JSON.parse(finalInjuries);
        } catch (e) {
            // If parse fails, wrap in array if it's a single string, or empty array
            finalInjuries = [finalInjuries];
        }
    }

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || 'user',
        height: height ? Number(height) : undefined,
        currentWeight: finalCurrentWeight ? Number(finalCurrentWeight) : undefined,
        targetWeight: targetWeight ? Number(targetWeight) : undefined,
        bmi: bmi ? Number(bmi) : undefined,
        gender: normalizedGender,
        age: age ? Number(age) : undefined,
        fitnessGoal: finalFitnessGoal,
        activityLevel: activityLevel || workoutType, // fallback mapping
        medicalConditions: finalInjuries,
        otp,
        otpExpires,
        isVerified: false // Explicitly set false
    });

    if (user) {
        try {
            console.log(`[DEV] OTP for ${user.email}: ${otp}`); // Log OTP for Dev
            const message = getOtpEmailTemplate(otp);

            await sendEmail({
                email: user.email,
                subject: 'Trainer - Verify Your Email',
                message
            });

            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                message: 'Registration successful. OTP sent to email.',
                isVerified: false
            };
        } catch (error) {
            console.error('Email send failed:', error);
            // In dev, don't fail registration, just log.
            // await user.deleteOne();
            // throw new Error('Email could not be sent. Registration failed. Please try again.');
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                message: 'Registration successful. OTP log in console (Dev).',
                isVerified: false
            };
        }
    } else {
        throw new Error('Invalid user data');
    }
};

const login = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    if (!user.isVerified) {
        throw new Error('Account not verified. Please verify your email/OTP');
    }

    if (user.isBlocked) {
        throw new Error('Account is blocked. Please contact support.');
    }

    if (await bcrypt.compare(password, user.password)) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            subscription: user.subscription,
            height: user.height,
            currentWeight: user.currentWeight,
            targetWeight: user.targetWeight,
            bmi: user.bmi,
            gender: user.gender,
            age: user.age,
            fitnessGoal: user.fitnessGoal,
            activityLevel: user.activityLevel,
            token: generateToken(user._id),
        };
    } else {
        throw new Error('Invalid email or password');
    }
};

const verifyOtp = async (email, otp) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.otp === otp && user.otpExpires > Date.now()) {
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Return token so user is logged in immediately after verification
        return {
            message: 'Email verified successfully',
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            height: user.height,
            currentWeight: user.currentWeight,
            targetWeight: user.targetWeight,
            bmi: user.bmi,
            gender: user.gender,
            age: user.age,
            fitnessGoal: user.fitnessGoal,
            activityLevel: user.activityLevel,
            token: generateToken(user._id)
        };
    } else {
        throw new Error('Invalid or expired OTP');
    }
};

const forgotPassword = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User with this email does not exist.');
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user.otp = token; // Resuing otp field for reset token
    user.otpExpires = tokenExpires;
    await user.save();

    // Construct the reset URL
    // Use MAIN_DOMAIN or BASE_URL from env, default to local
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const resetUrl = `${baseUrl}/api/auth/reset-password?token=${token}&email=${email}`;

    console.log(`Reset Password Link for ${email}: ${resetUrl}`);

    try {
        const message = getResetPasswordEmailTemplate(resetUrl);
        await sendEmail({
            email: user.email,
            subject: 'Trainer - Password Reset Request',
            message
        });
        return { message: 'Password reset link sent to your email.' };
    } catch (error) {
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        throw new Error('Email could not be sent. Please try again later.');
    }
};

// Forgot Password - OTP mode (for mobile app)
const forgotPasswordOtp = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User with this email does not exist.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log(`[DEV] Forgot Password OTP for ${email}: ${otp}`);

    try {
        const message = getForgotPasswordOtpTemplate(otp);
        await sendEmail({
            email: user.email,
            subject: 'Trainer - Password Reset Code',
            message
        });
        return { message: 'Verification code sent to your email.' };
    } catch (error) {
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        throw new Error('Email could not be sent. Please try again later.');
    }
};

// Verify forgot password OTP (does not modify user - just validates)
const verifyForgotOtp = async (email, otp) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }
    if (user.otp === otp && user.otpExpires > Date.now()) {
        return { valid: true };
    }
    throw new Error('Invalid or expired verification code');
};

const verifyResetToken = async (email, token) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found'); // Or 'Invalid link'
    }

    if (user.otp === token && user.otpExpires > Date.now()) {
        return true;
    }
    return false;
};

const resetPassword = async (email, token, newPassword) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    if (user.otp === token && user.otpExpires > Date.now()) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.otp = undefined;
        user.otpExpires = undefined;
        // Also verify user if they weren't somehow
        if (!user.isVerified) user.isVerified = true;

        await user.save();
        return { message: 'Password reset successful. You can now login.' };
    } else {
        throw new Error('Invalid or expired reset link. Please request a new one.');
    }
};

const resendOtp = async (email) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    try {
        const message = getOtpEmailTemplate(otp);
        await sendEmail({
            email: user.email,
            subject: 'Trainer - New Verification Code',
            message
        });
        return { message: 'New OTP sent to email' };
    } catch (error) {
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        throw new Error('Email could not be sent');
    }
};

module.exports = {
    register,
    login,
    verifyOtp,
    forgotPassword,
    forgotPasswordOtp,
    verifyForgotOtp,
    verifyResetToken,
    resetPassword,
    resendOtp
};
