const User = require('./user.model');

const findAllUsers = async (filter = {}) => {
    return await User.find(filter).sort({ createdAt: -1 });
};

const createUser = async (userData) => {
    const user = new User(userData);
    return await user.save();
};

const findUserByEmail = async (email) => {
    return await User.findOne({ email });
};

module.exports = {
    findAllUsers,
    createUser,
    findUserByEmail
};
