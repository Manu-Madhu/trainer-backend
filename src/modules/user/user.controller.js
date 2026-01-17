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

module.exports = { getUsers, getUserById, registerUser, toggleBlockStatus, deleteUser, updateUser };
