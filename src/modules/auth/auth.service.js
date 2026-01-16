const User = require('../user/user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const register = async (userData) => {
    const { name, email, password, role, phone } = userData;

    const userExists = await User.findOne({ email });

    if (userExists) {
        throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Mock OTP for now
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || 'user',
        otp,
        otpExpires
    });

    if (user) {
        // In real app, send OTP via email/SMS here
        console.log(`OTP for ${email}: ${otp}`);

        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        };
    } else {
        throw new Error('Invalid user data');
    }
};

const login = async (email, password) => {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
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
        return { message: 'Email verified successfully' };
    } else {
        throw new Error('Invalid or expired OTP');
    }
};

module.exports = {
    register,
    login,
    verifyOtp
};
