const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./modules/user/user.model');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        // Clear existing users to avoid duplicates
        await User.deleteMany();

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password@1', salt);

        const users = [
            {
                name: 'Admin User',
                email: 'admin@gmail.com',
                password: hashedPassword,
                role: 'admin',
                phone: '1234567890',
                isVerified: true,
            },
            {
                name: 'Normal User',
                email: 'user@gmail.com',
                password: hashedPassword,
                role: 'user',
                phone: '0987654321',
                isVerified: true,
            },
            {
                name: 'Premium User',
                email: 'userpaid@gmail.com',
                password: hashedPassword,
                role: 'user',
                subscription: {
                    plan: 'premium',
                    status: 'active',
                    startDate: new Date(),
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                },
                isVerified: true,
            },
            {
                name: 'Trainer User',
                email: 'trainer@gmail.com',
                password: hashedPassword,
                role: 'trainer',
                specialization: 'HIIT & Strength',
                isVerified: true,
            }
        ];

        await User.insertMany(users);

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

const destroyData = async () => {
    try {
        await User.deleteMany();
        console.log('Data Destroyed!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    destroyData();
} else {
    importData();
}
