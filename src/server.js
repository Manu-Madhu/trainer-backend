const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Basic Route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Import Routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const mediaRoutes = require('./modules/media/media.routes');
const workoutRoutes = require('./modules/workout/workout.routes');
const mealRoutes = require('./modules/meal/meal.routes');
const progressRoutes = require('./modules/progress/progress.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const subscriptionRoutes = require('./modules/subscription/subscription.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const scheduleRoutes = require('./modules/schedule/schedule.routes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/schedule', scheduleRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    const fs = require('fs');
    try { fs.appendFileSync('error.log', `[${new Date().toISOString()}] Global Error: ${err.stack}\n`); } catch (e) { }
    console.error(err.stack);
    res.status(500).json({
        message: err.message,
    });
});


const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
