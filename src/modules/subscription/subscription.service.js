const SubscriptionPlan = require('./subscription.model');
const User = require('../user/user.model');

const getPlans = async () => {
    return await SubscriptionPlan.find({ isActive: true });
};

const subscribeUser = async (userId, planId) => {
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) throw new Error('Plan not found');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationInDays);

    const user = await User.findById(userId);
    user.subscription = {
        plan: 'premium',
        status: 'active',
        startDate,
        endDate
    };

    return await user.save();
};

const createPlan = async (planData) => {
    return await SubscriptionPlan.create(planData);
};

module.exports = {
    getPlans,
    subscribeUser,
    createPlan
};
