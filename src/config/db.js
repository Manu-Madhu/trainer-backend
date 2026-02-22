const mongoose = require('mongoose');

// Check if already connected
const isConnected = () => {
    return mongoose.connection.readyState === 1;
};

const connectDB = async () => {
    // If already connected, return
    if (isConnected()) {
        console.log('MongoDB already connected');
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000, // Increased to 10s
            socketTimeoutMS: 45000,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 2, // Maintain at least 2 socket connections
            bufferCommands: false, // Disable mongoose buffering
            bufferMaxEntries: 0, // Disable mongoose buffering
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Don't exit in serverless - let it retry
        if (process.env.VERCEL) {
            console.error('Running on Vercel - connection will retry on next request');
        } else {
            process.exit(1);
        }
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

module.exports = connectDB;
