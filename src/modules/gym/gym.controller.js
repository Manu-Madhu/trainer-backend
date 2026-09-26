const Gym = require('./gym.model');
const GymCheckIn = require('./gymCheckIn.model');
const GymSettlement = require('./gymSettlement.model');

// Helper to get Gym associated with current logged-in partner
const getGymForUser = async (userId) => {
    const gym = await Gym.findOne({ userId });
    return gym;
};

// @desc    Gym Partner: Get live dashboard stats
// @route   GET /api/gym/dashboard
// @access  Private (Gym Partner)
const getGymDashboard = async (req, res) => {
    try {
        const gym = await getGymForUser(req.user._id);
        if (!gym) {
            return res.status(404).json({ message: 'Gym profile not found for this user account' });
        }

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [todayCount, monthCount, pendingStats, lifetimeCount, recentCheckIns] = await Promise.all([
            GymCheckIn.countDocuments({
                gymId: gym._id,
                checkInDate: { $gte: startOfToday },
            }),
            GymCheckIn.countDocuments({
                gymId: gym._id,
                checkInDate: { $gte: startOfMonth },
            }),
            GymCheckIn.aggregate([
                {
                    $match: {
                        gymId: gym._id,
                        settlementStatus: 'pending',
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalPendingAmount: { $sum: '$sessionCost' },
                        totalPendingCount: { $sum: 1 },
                    },
                },
            ]),
            GymCheckIn.countDocuments({ gymId: gym._id }),
            GymCheckIn.find({ gymId: gym._id })
                .populate('userId', 'name email avatar')
                .sort({ checkInDate: -1 })
                .limit(15),
        ]);

        const pendingPayoutAmount = pendingStats[0]?.totalPendingAmount || 0;
        const pendingCheckInsCount = pendingStats[0]?.totalPendingCount || 0;

        res.json({
            success: true,
            data: {
                gym: {
                    id: gym._id,
                    gymName: gym.gymName,
                    address: gym.address,
                    perSessionCost: gym.perSessionCost,
                    isActive: gym.isActive,
                    qrCodeToken: gym.qrCodeToken,
                },
                stats: {
                    todayCheckIns: todayCount,
                    monthCheckIns: monthCount,
                    pendingPayoutAmount,
                    pendingCheckInsCount,
                    lifetimeCheckIns: lifetimeCount,
                },
                recentCheckIns,
            },
        });
    } catch (error) {
        console.error('getGymDashboard error:', error);
        res.status(500).json({ message: error.message || 'Server error fetching gym dashboard' });
    }
};

// @desc    Gym Partner: Get QR Code information for Reception Display
// @route   GET /api/gym/qr-code
// @access  Private (Gym Partner)
const getGymQRCode = async (req, res) => {
    try {
        const gym = await getGymForUser(req.user._id);
        if (!gym) {
            return res.status(404).json({ message: 'Gym profile not found' });
        }

        res.json({
            success: true,
            data: {
                gymId: gym._id,
                gymName: gym.gymName,
                tagline: gym.tagline,
                address: gym.address,
                perSessionCost: gym.perSessionCost,
                qrCodeToken: gym.qrCodeToken,
                qrPayload: JSON.stringify({
                    type: 'TRAINER_PARTNER_GYM',
                    gymId: gym._id,
                    token: gym.qrCodeToken,
                    name: gym.gymName,
                }),
            },
        });
    } catch (error) {
        console.error('getGymQRCode error:', error);
        res.status(500).json({ message: error.message || 'Server error fetching QR details' });
    }
};

// @desc    Gym Partner: Get paginated check-in history
// @route   GET /api/gym/check-ins
// @access  Private (Gym Partner)
const getGymCheckIns = async (req, res) => {
    try {
        const gym = await getGymForUser(req.user._id);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [checkIns, total] = await Promise.all([
            GymCheckIn.find({ gymId: gym._id })
                .populate('userId', 'name email avatar phone')
                .sort({ checkInDate: -1 })
                .skip(skip)
                .limit(limit),
            GymCheckIn.countDocuments({ gymId: gym._id }),
        ]);

        res.json({
            success: true,
            page,
            totalPages: Math.ceil(total / limit),
            total,
            data: checkIns,
        });
    } catch (error) {
        console.error('getGymCheckIns error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Gym Partner: Get monthly payout settlements
// @route   GET /api/gym/settlements
// @access  Private (Gym Partner)
const getGymSettlements = async (req, res) => {
    try {
        const gym = await getGymForUser(req.user._id);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        const settlements = await GymSettlement.find({ gymId: gym._id })
            .sort({ year: -1, month: -1 });

        res.json({
            success: true,
            data: settlements,
        });
    } catch (error) {
        console.error('getGymSettlements error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Gym Partner: Update profile (amenities, hours, bank details)
// @route   PUT /api/gym/profile
// @access  Private (Gym Partner)
const updateGymProfile = async (req, res) => {
    try {
        const gym = await getGymForUser(req.user._id);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        const { tagline, amenities, openingHours, bankDetails, photos } = req.body;
        if (tagline !== undefined) gym.tagline = tagline;
        if (amenities !== undefined) gym.amenities = amenities;
        if (openingHours !== undefined) gym.openingHours = openingHours;
        if (bankDetails !== undefined) gym.bankDetails = bankDetails;
        if (photos !== undefined) gym.photos = photos;

        await gym.save();

        res.json({
            success: true,
            message: 'Gym profile updated successfully',
            data: gym,
        });
    } catch (error) {
        console.error('updateGymProfile error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

module.exports = {
    getGymDashboard,
    getGymQRCode,
    getGymCheckIns,
    getGymSettlements,
    updateGymProfile,
};
