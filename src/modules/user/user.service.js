const userRepository = require('./user.repository');

const getAllUsers = async (query = {}) => {
    const filter = {};
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    if (query.role) {
        filter.role = query.role;
    }
    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: 'i' } },
            { email: { $regex: query.search, $options: 'i' } }
        ];
    }
    if (query.startDate && query.endDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
    } else if (query.date) {
        // Assuming date comes as YYYY-MM-DD
        const startOfDay = new Date(query.date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(query.date);
        endOfDay.setHours(23, 59, 59, 999);

        filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    return await userRepository.findAllUsers(filter, { skip, limit });
};

const registerUser = async (userData) => {
    // Check if user exists
    const userExists = await userRepository.findUserByEmail(userData.email);
    if (userExists) {
        throw new Error('User already exists');
    }

    // In a real app, hash password here before sending to repo
    return await userRepository.createUser(userData);
};

const toggleUserBlockStatus = async (userId) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return await userRepository.updateUser(userId, { isBlocked: !user.isBlocked });
};

const deleteUser = async (userId) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return await userRepository.deleteUser(userId);
};

const updateUser = async (userId, updateData) => {
    const user = await userRepository.findUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return await userRepository.updateUser(userId, updateData);
};

module.exports = {
    getAllUsers,
    registerUser,
    toggleUserBlockStatus,
    deleteUser,
    updateUser
};
