const userService = require('./user.service');

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers(req.query);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
const getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const uploadFileToS3 = require('../../utils/s3Upload');

// ... (getUsers remains same)

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
    try {
        let avatarUrl = null;
        if (req.file) {
            avatarUrl = await uploadFileToS3(req.file);
        }

        const userData = { ...req.body, avatar: avatarUrl };
        const user = await userService.registerUser(userData);
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Toggle user block status
// @route   PATCH /api/users/:id/block
// @access  Admin
const toggleBlockStatus = async (req, res) => {
    try {
        const user = await userService.toggleUserBlockStatus(req.params.id);
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = async (req, res) => {
    try {
        await userService.deleteUser(req.params.id);
        res.json({ message: 'User removed' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Admin
const updateUser = async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (req.file) {
            const avatarUrl = await uploadFileToS3(req.file);
            updateData.avatar = avatarUrl;
        }

        const user = await userService.updateUser(req.params.id, updateData);
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get User Home Data
// @route   GET /api/users/home
// @access  Private
const getHomeData = async (req, res) => {
    try {
        // Assuming req.user.id is populated by auth middleware
        const data = await userService.getHomeData(req.user.id);
        res.json(data);
    } catch (error) {
        const fs = require('fs');
        try { fs.appendFileSync('error.log', `[${new Date().toISOString()}] getHomeData Error: ${error.stack}\n`); } catch (e) { }
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request Premium
// @route   POST /api/users/premium-request
// @access  Private
const requestPremium = async (req, res) => {
    try {
        let screenshotUrl = null;
        if (req.file) {
            screenshotUrl = await uploadFileToS3(req.file);
        } else if (req.body.screenshotUrl) {
            screenshotUrl = req.body.screenshotUrl;
        }

        if (!screenshotUrl) {
            return res.status(400).json({ message: 'Screenshot is required' });
        }

        const result = await userService.requestPremium(req.user.id, screenshotUrl);
        res.json(result);
    } catch (error) {
        console.error("Request Premium Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const requestAccountDeletion = async (req, res) => {
    try {
        const userId = req.user.id; // User requesting their own deletion
        await userService.requestAccountDeletion(userId);
        res.json({ message: 'Account marked for deletion successfully.' });
    } catch (error) {
        console.error("Request Account Deletion Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getUsers, getUserById, registerUser, toggleBlockStatus, deleteUser, updateUser, getHomeData, requestPremium, requestAccountDeletion };
