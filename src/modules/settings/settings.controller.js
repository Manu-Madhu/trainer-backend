const Settings = require('./settings.model');

// @desc    Get payment settings
// @route   GET /api/settings/payment
// @access  Public/Private
const getPaymentSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ type: 'payment_config' });

        if (!settings) {
            // Create default if not exists
            settings = await Settings.create({
                type: 'payment_config',
                upiId: 'ajithrajsree-1@oksbi',
                amount: 500,
                platinumAmount: 999
            });
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update payment settings
// @route   PUT /api/settings/payment
// @access  Private (Admin)
const updatePaymentSettings = async (req, res) => {
    try {
        const { upiId, amount, platinumAmount } = req.body;

        let settings = await Settings.findOne({ type: 'payment_config' });

        if (settings) {
            if (upiId !== undefined) settings.upiId = upiId;
            if (amount !== undefined) settings.amount = Number(amount);
            if (platinumAmount !== undefined) settings.platinumAmount = Number(platinumAmount);
            await settings.save();
        } else {
            settings = await Settings.create({
                type: 'payment_config',
                upiId: upiId || 'ajithrajsree-1@oksbi',
                amount: amount !== undefined ? Number(amount) : 500,
                platinumAmount: platinumAmount !== undefined ? Number(platinumAmount) : 999
            });
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPaymentSettings,
    updatePaymentSettings
};
