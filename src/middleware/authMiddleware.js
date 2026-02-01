const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
const { checkAndExpireSubscription } = require('../modules/user/user.service');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // OPTIMIZED: Only check expiration if user is currently active/premium
            // This prevents unnecessary service calls for Free users or already Expired users
            if (req.user.subscription &&
                req.user.subscription.plan === 'premium' &&
                req.user.subscription.status === 'active' &&
                req.user.subscription.endDate) {

                // We await this because if they ARE expired, we want effectively 'instant' block 
                // for subsequent middleware that might rely on status
                await checkAndExpireSubscription(req.user);
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const trainer = (req, res, next) => {
    if (req.user && (req.user.role === 'trainer' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as a trainer' });
    }
};

module.exports = { protect, admin, trainer };
