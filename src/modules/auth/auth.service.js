const User = require('../user/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../../utils/sendEmail');
const { getOtpEmailTemplate } = require('../../utils/emailTemplates');

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
        throw new Error('User not found');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log(`Reset Password OTP for ${email}: ${otp}`);

    return { message: 'OTP sent to email for password reset' };
};

const resetPassword = async (email, otp, newPassword) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }

    if (user.otp === otp && user.otpExpires > Date.now()) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.otp = undefined;
        user.otpExpires = undefined;
        // Also verify user if they weren't somehow
        if (!user.isVerified) user.isVerified = true;

        await user.save();
        return { message: 'Password reset successful. You can now login.' };
    } else {
        throw new Error('Invalid or expired OTP');
    }
}

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
    resetPassword,
    resendOtp
};
