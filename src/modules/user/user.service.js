const userRepository = require('./user.repository');

const getAllUsers = async (query = {}) => {
    const filter = {};
    if (query.role) {
        filter.role = query.role;
    }
    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: 'i' } },
            { email: { $regex: query.search, $options: 'i' } }
        ];
    }
    return await userRepository.findAllUsers(filter);
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

module.exports = {
    getAllUsers,
    registerUser,
};
