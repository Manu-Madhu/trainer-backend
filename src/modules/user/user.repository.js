const User = require('./user.model');

const findAllUsers = async (filter = {}, options = {}) => {
    const { skip = 0, limit = 10 } = options;
    const users = await User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const total = await User.countDocuments(filter);
    return { users, total };
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
