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
                amount: 500
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
        const { upiId, amount } = req.body;

        let settings = await Settings.findOne({ type: 'payment_config' });

        if (settings) {
            settings.upiId = upiId || settings.upiId;
            settings.amount = amount || settings.amount;
            await settings.save();
        } else {
            settings = await Settings.create({
                type: 'payment_config',
                upiId: upiId || 'ajithrajsree-1@oksbi',
                amount: amount || 500
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
