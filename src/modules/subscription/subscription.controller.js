const subscriptionService = require('./subscription.service');

// @desc    Get subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getPlans = async (req, res) => {
    try {
        const plans = await subscriptionService.getPlans();
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Subscribe to a plan
// @route   POST /api/subscriptions/subscribe
// @access  Private
const subscribe = async (req, res) => {
    try {
        const { planId } = req.body;
        const result = await subscriptionService.subscribeUser(req.user._id, planId);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Create plan (Admin)
// @route   POST /api/subscriptions/plans
// @access  Private (Admin)
const createPlan = async (req, res) => {
    try {
        const plan = await subscriptionService.createPlan(req.body);
        res.status(201).json(plan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getPlans,
    subscribe,
    createPlan
};
