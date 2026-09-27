const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../user/user.model');
const Gym = require('./gym.model');
const GymCheckIn = require('./gymCheckIn.model');
const GymSettlement = require('./gymSettlement.model');

// @desc    Admin: Onboard a new partner gym
// @route   POST /api/gym/admin/onboard
// @access  Private (Admin)
const onboardGym = async (req, res) => {
    try {
        const {
            gymName,
            tagline,
            contactPerson,
            email,
            password,
            phone,
            address,
            coordinates, // [longitude, latitude] or { longitude, latitude }
            perSessionCost,
            totalSquareFeet,
            totalEquipments,
            totalTrainers,
            amenities,
            photos,
            videoUrl,
            videos,
            openingHours,
            bankDetails,
        } = req.body;

        if (!gymName || !email || !password || !phone) {
            return res.status(400).json({ message: 'Gym name, email, password, and phone are required' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (userExists) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        // Format coordinates [longitude, latitude]
        let lng = 0;
        let lat = 0;
        if (Array.isArray(coordinates) && coordinates.length >= 2) {
            lng = Number(coordinates[0]) || 0;
            lat = Number(coordinates[1]) || 0;
        } else if (coordinates && typeof coordinates === 'object') {
            lng = Number(coordinates.longitude || coordinates.lng) || 0;
            lat = Number(coordinates.latitude || coordinates.lat) || 0;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 1. Create User with role: 'gym'
        const user = await User.create({
            name: gymName,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            phone,
            role: 'gym',
            isVerified: true,
        });

        // 2. Generate unique QR Code token
        const qrCodeToken = `GYM_${crypto.randomUUID()}`;

        // 3. Create Gym document
        const gym = await Gym.create({
            userId: user._id,
            gymName,
            tagline: tagline || '',
            contactPerson: contactPerson || gymName,
            phone,
            email: email.toLowerCase().trim(),
            address: {
                street: address?.street || '',
                city: address?.city || 'Unknown City',
                state: address?.state || '',
                pincode: address?.pincode || '',
            },
            location: {
                type: 'Point',
                coordinates: [lng, lat],
            },
            perSessionCost: perSessionCost ? Number(perSessionCost) : 100,
            totalSquareFeet: totalSquareFeet ? Number(totalSquareFeet) : 0,
            totalEquipments: totalEquipments ? Number(totalEquipments) : 0,
            totalTrainers: totalTrainers ? Number(totalTrainers) : 0,
            qrCodeToken,
            amenities: Array.isArray(amenities) ? amenities : [],
            photos: Array.isArray(photos) ? photos : [],
            videoUrl: videoUrl || (Array.isArray(videos) && videos[0]) || '',
            videos: Array.isArray(videos) ? videos : (videoUrl ? [videoUrl] : []),
            openingHours: openingHours || { weekdays: '06:00 AM - 10:00 PM', weekends: '07:00 AM - 08:00 PM' },
            bankDetails: bankDetails || {},
            isActive: true,
        });

        res.status(201).json({
            success: true,
            message: 'Gym onboarded successfully',
            data: gym,
        });
    } catch (error) {
        console.error('onboardGym error:', error);
        res.status(500).json({ message: error.message || 'Server error while onboarding gym' });
    }
};

// @desc    Admin: Get all gyms with metrics (check-ins count, pending payout balance)
// @route   GET /api/gym/admin/all
// @access  Private (Admin)
const getAllGyms = async (req, res) => {
    try {
        const gyms = await Gym.find().populate('userId', 'name email phone').sort({ createdAt: -1 });

        // Calculate current month date bounds
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const enrichedGyms = await Promise.all(
            gyms.map(async (gym) => {
                const [todayCount, monthCount, pendingStats] = await Promise.all([
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
                ]);

                const pendingAmount = pendingStats[0]?.totalPendingAmount || 0;
                const pendingCount = pendingStats[0]?.totalPendingCount || 0;

                return {
                    ...gym.toObject(),
                    stats: {
                        todayCheckIns: todayCount,
                        monthCheckIns: monthCount,
                        pendingPayoutAmount: pendingAmount,
                        pendingCheckInsCount: pendingCount,
                    },
                };
            })
        );

        res.json({
            success: true,
            count: enrichedGyms.length,
            data: enrichedGyms,
        });
    } catch (error) {
        console.error('getAllGyms error:', error);
        res.status(500).json({ message: error.message || 'Server error fetching gyms' });
    }
};

// @desc    Admin: Get single gym details with check-in history & settlements
// @route   GET /api/gym/admin/:id
// @access  Private (Admin)
const getGymById = async (req, res) => {
    try {
        const gym = await Gym.findById(req.params.id).populate('userId', 'name email phone');
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        const [recentCheckIns, settlements, totalStats] = await Promise.all([
            GymCheckIn.find({ gymId: gym._id })
                .populate('userId', 'name email avatar phone')
                .sort({ checkInDate: -1 })
                .limit(25),
            GymSettlement.find({ gymId: gym._id }).sort({ year: -1, month: -1 }),
            GymCheckIn.aggregate([
                { $match: { gymId: gym._id } },
                {
                    $group: {
                        _id: '$settlementStatus',
                        totalCount: { $sum: 1 },
                        totalAmount: { $sum: '$sessionCost' },
                    },
                },
            ]),
        ]);

        let pendingAmount = 0;
        let pendingCount = 0;
        let settledAmount = 0;
        let settledCount = 0;

        totalStats.forEach((stat) => {
            if (stat._id === 'pending') {
                pendingAmount = stat.totalAmount;
                pendingCount = stat.totalCount;
            } else if (stat._id === 'settled') {
                settledAmount = stat.totalAmount;
                settledCount = stat.totalCount;
            }
        });

        res.json({
            success: true,
            data: {
                gym,
                stats: {
                    pendingAmount,
                    pendingCount,
                    settledAmount,
                    settledCount,
                    lifetimeVisits: pendingCount + settledCount,
                },
                recentCheckIns,
                settlements,
            },
        });
    } catch (error) {
        console.error('getGymById error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Admin: Update gym details or toggle active status
// @route   PUT /api/gym/admin/:id
// @access  Private (Admin)
const updateGym = async (req, res) => {
    try {
        const gym = await Gym.findById(req.params.id);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        const updatableFields = [
            'gymName',
            'tagline',
            'contactPerson',
            'phone',
            'address',
            'perSessionCost',
            'totalSquareFeet',
            'totalEquipments',
            'totalTrainers',
            'amenities',
            'photos',
            'videoUrl',
            'videos',
            'openingHours',
            'bankDetails',
            'isActive',
        ];

        updatableFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                gym[field] = req.body[field];
            }
        });

        if (req.body.coordinates) {
            let lng = gym.location.coordinates[0];
            let lat = gym.location.coordinates[1];
            if (Array.isArray(req.body.coordinates)) {
                lng = Number(req.body.coordinates[0]) || lng;
                lat = Number(req.body.coordinates[1]) || lat;
            } else if (typeof req.body.coordinates === 'object') {
                lng = Number(req.body.coordinates.longitude || req.body.coordinates.lng) || lng;
                lat = Number(req.body.coordinates.latitude || req.body.coordinates.lat) || lat;
            }
            gym.location = {
                type: 'Point',
                coordinates: [lng, lat],
            };
        }

        await gym.save();

        res.json({
            success: true,
            message: 'Gym updated successfully',
            data: gym,
        });
    } catch (error) {
        console.error('updateGym error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Admin: Get monthly settlement summary for all partner gyms
// @route   GET /api/gym/admin/settlements/summary
// @access  Private (Admin)
const getSettlementsSummary = async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-12
        const year = parseInt(req.query.year) || now.getFullYear();

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        const checkInAggregation = await GymCheckIn.aggregate([
            {
                $match: {
                    checkInDate: { $gte: startDate, $lt: endDate },
                },
            },
            {
                $group: {
                    _id: '$gymId',
                    totalCheckIns: { $sum: 1 },
                    pendingCheckIns: {
                        $sum: { $cond: [{ $eq: ['$settlementStatus', 'pending'] }, 1, 0] },
                    },
                    settledCheckIns: {
                        $sum: { $cond: [{ $eq: ['$settlementStatus', 'settled'] }, 1, 0] },
                    },
                    pendingAmount: {
                        $sum: { $cond: [{ $eq: ['$settlementStatus', 'pending'] }, '$sessionCost', 0] },
                    },
                    settledAmount: {
                        $sum: { $cond: [{ $eq: ['$settlementStatus', 'settled'] }, '$sessionCost', 0] },
                    },
                },
            },
        ]);

        const gyms = await Gym.find({ isActive: true }).select('gymName phone email bankDetails perSessionCost');
        const gymMap = new Map();
        gyms.forEach((g) => gymMap.set(g._id.toString(), g));

        const summaries = [];
        for (const item of checkInAggregation) {
            const gym = gymMap.get(item._id.toString());
            if (gym) {
                // Check if a settlement record already exists
                const settlement = await GymSettlement.findOne({
                    gymId: gym._id,
                    month,
                    year,
                });

                summaries.push({
                    gymId: gym._id,
                    gymName: gym.gymName,
                    phone: gym.phone,
                    email: gym.email,
                    bankDetails: gym.bankDetails,
                    perSessionCost: gym.perSessionCost,
                    totalCheckIns: item.totalCheckIns,
                    pendingCheckIns: item.pendingCheckIns,
                    settledCheckIns: item.settledCheckIns,
                    pendingAmount: item.pendingAmount,
                    settledAmount: item.settledAmount,
                    settlementRecord: settlement || null,
                });
            }
        }

        res.json({
            success: true,
            month,
            year,
            data: summaries,
        });
    } catch (error) {
        console.error('getSettlementsSummary error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Admin: Process & settle monthly payout for a partner gym
// @route   POST /api/gym/admin/:id/settle
// @access  Private (Admin)
const settleGymPayout = async (req, res) => {
    try {
        const gymId = req.params.id;
        const { month, year, transactionReference, notes } = req.body;

        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }

        const gym = await Gym.findById(gymId);
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found' });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        // Find pending check-ins in this period
        const pendingCheckIns = await GymCheckIn.find({
            gymId,
            settlementStatus: 'pending',
            checkInDate: { $gte: startDate, $lt: endDate },
        });

        if (pendingCheckIns.length === 0) {
            return res.status(400).json({ message: 'No pending check-ins found for this period' });
        }

        const totalCheckIns = pendingCheckIns.length;
        const totalAmount = pendingCheckIns.reduce((sum, item) => sum + item.sessionCost, 0);

        // Create or update GymSettlement
        let settlement = await GymSettlement.findOne({ gymId, month, year });
        if (!settlement) {
            settlement = new GymSettlement({
                gymId,
                month,
                year,
            });
        }

        settlement.totalCheckIns = totalCheckIns;
        settlement.totalAmount = totalAmount;
        settlement.payoutStatus = 'paid';
        settlement.paidAt = new Date();
        settlement.transactionReference = transactionReference || `BANK_SETTLE_${Date.now()}`;
        settlement.notes = notes || '';
        settlement.processedBy = req.user._id;

        await settlement.save();

        // Mark check-ins as settled
        await GymCheckIn.updateMany(
            {
                gymId,
                settlementStatus: 'pending',
                checkInDate: { $gte: startDate, $lt: endDate },
            },
            {
                $set: {
                    settlementStatus: 'settled',
                    settlementId: settlement._id,
                },
            }
        );

        res.json({
            success: true,
            message: `Successfully settled ₹${totalAmount} for ${totalCheckIns} check-ins`,
            data: settlement,
        });
    } catch (error) {
        console.error('settleGymPayout error:', error);
        res.status(500).json({ message: error.message || 'Server error settling payout' });
    }
};

module.exports = {
    onboardGym,
    getAllGyms,
    getGymById,
    updateGym,
    getSettlementsSummary,
    settleGymPayout,
};
