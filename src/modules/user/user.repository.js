const User = require('./user.model');

const findAllUsers = async () => {
    return await User.find({});
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
