const userRepository = require('./user.repository');

const getAllUsers = async () => {
    return await userRepository.findAllUsers();
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
