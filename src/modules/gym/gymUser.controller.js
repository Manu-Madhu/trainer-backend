const Gym = require('./gym.model');
const GymCheckIn = require('./gymCheckIn.model');
const User = require('../user/user.model');

// Helper: Haversine distance in meters
const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

// @desc    User: Get nearby partner gyms or search by city
// @route   GET /api/gym/nearby
// @access  Public / Private
const getNearbyGyms = async (req, res) => {
    try {
        const { longitude, latitude, radiusKm = 25, city, search } = req.query;

        let query = { isActive: true };

        if (city) {
            query['address.city'] = { $regex: new RegExp(city, 'i') };
        }

        if (search) {
            query.$or = [
                { gymName: { $regex: new RegExp(search, 'i') } },
                { 'address.city': { $regex: new RegExp(search, 'i') } },
                { 'address.street': { $regex: new RegExp(search, 'i') } },
            ];
        }

        let gyms;

        if (longitude && latitude && !isNaN(Number(longitude)) && !isNaN(Number(latitude))) {
            const userLng = Number(longitude);
            const userLat = Number(latitude);
            const maxDistance = (Number(radiusKm) || 25) * 1000; // in meters

            // Perform geo-spatial query if valid coords
            try {
                gyms = await Gym.find({
                    ...query,
                    location: {
                        $near: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [userLng, userLat],
                            },
                            $maxDistance: maxDistance,
                        },
                    },
                }).select('-qrCodeToken -bankDetails -userId');
            } catch (geoError) {
                console.warn('Geo query fallback:', geoError.message);
                gyms = await Gym.find(query).select('-qrCodeToken -bankDetails -userId').limit(30);
            }
        } else {
            gyms = await Gym.find(query).select('-qrCodeToken -bankDetails -userId').limit(30);
        }

        // Attach computed distance if user location is provided
        const enrichedGyms = gyms.map((g) => {
            const obj = g.toObject();
            if (longitude && latitude && g.location?.coordinates?.length >= 2) {
                const distMeters = calculateDistanceMeters(
                    Number(latitude),
                    Number(longitude),
                    g.location.coordinates[1],
                    g.location.coordinates[0]
                );
                obj.distanceKm = (distMeters / 1000).toFixed(1);
            }
            return obj;
        });

        // Prioritize closest gyms first
        if (longitude && latitude) {
            enrichedGyms.sort((a, b) => {
                const dA = a.distanceKm !== undefined ? Number(a.distanceKm) : 999999;
                const dB = b.distanceKm !== undefined ? Number(b.distanceKm) : 999999;
                return dA - dB;
            });
        }

        res.json({
            success: true,
            count: enrichedGyms.length,
            data: enrichedGyms,
        });
    } catch (error) {
        console.error('getNearbyGyms error:', error);
        res.status(500).json({ message: error.message || 'Server error searching gyms' });
    }
};

// @desc    User: Get single gym public details
// @route   GET /api/gym/details/:id
// @access  Public / Private
const getGymPublicDetails = async (req, res) => {
    try {
        const gym = await Gym.findById(req.params.id)
            .select('-qrCodeToken -bankDetails -userId');

        if (!gym || !gym.isActive) {
            return res.status(404).json({ message: 'Gym not found or inactive' });
        }

        res.json({
            success: true,
            data: gym,
        });
    } catch (error) {
        console.error('getGymPublicDetails error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    User: Check in at partner gym by scanning QR code
// @route   POST /api/gym/check-in
// @access  Private (User with Platinum Plan)
const checkInAtGym = async (req, res) => {
    try {
        const { qrToken, latitude, longitude } = req.body;

        if (!qrToken) {
            return res.status(400).json({ message: 'QR Code token is required' });
        }

        // 1. Find Gym by QR Token
        const gym = await Gym.findOne({ qrCodeToken: qrToken });
        if (!gym) {
            return res.status(404).json({ message: 'Invalid or unrecognized Gym QR code' });
        }

        if (!gym.isActive) {
            return res.status(400).json({ message: 'This partner gym is currently inactive' });
        }

        // 2. Fetch fresh user with subscription details
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check if user has active Platinum Pass
        const isPlatinum =
            user.subscription &&
            user.subscription.plan === 'platinum' &&
            user.subscription.status === 'active';

        if (!isPlatinum) {
            return res.status(403).json({
                success: false,
                requireUpgrade: true,
                message: 'Universal Gym Access requires an active Platinum Pass. Upgrade your plan to work out anywhere!',
            });
        }

        // 3. Check Daily Check-In Limit (1 check-in per calendar day)
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const existingCheckInToday = await GymCheckIn.findOne({
            userId: user._id,
            checkInDate: { $gte: startOfToday, $lte: endOfToday },
        }).populate('gymId', 'gymName');

        if (existingCheckInToday) {
            return res.status(400).json({
                success: false,
                alreadyCheckedIn: true,
                message: `You have already used your daily gym pass today at ${existingCheckInToday.gymId?.gymName || 'a partner gym'}. Your next pass unlocks tomorrow!`,
                existingCheckIn: {
                    gymName: existingCheckInToday.gymId?.gymName,
                    time: existingCheckInToday.checkInDate,
                },
            });
        }

        // 4. (Optional) Geo-distance validation (if user coordinates are sent)
        if (latitude && longitude && gym.location?.coordinates?.length >= 2) {
            const distanceMeters = calculateDistanceMeters(
                Number(latitude),
                Number(longitude),
                gym.location.coordinates[1],
                gym.location.coordinates[0]
            );

            // If user is more than 800m away, we can flag or log (still allowing pass if location services are weak, or warn)
            if (distanceMeters > 800) {
                console.log(`[GeoWarning] User ${user._id} check-in at ${gym.gymName} is ${Math.round(distanceMeters)}m away`);
            }
        }

        // 5. Create Check-In Record
        const checkIn = await GymCheckIn.create({
            gymId: gym._id,
            userId: user._id,
            sessionCost: gym.perSessionCost, // snapshot current cost (e.g. ₹100)
            checkInDate: new Date(),
            userLocation: latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : undefined,
            settlementStatus: 'pending',
        });

        res.status(201).json({
            success: true,
            message: `Check-in approved! Welcome to ${gym.gymName}. Have a great workout!`,
            data: {
                checkInId: checkIn._id,
                gymName: gym.gymName,
                address: gym.address,
                perSessionCostCredited: gym.perSessionCost,
                checkInDate: checkIn.checkInDate,
            },
        });
    } catch (error) {
        console.error('checkInAtGym error:', error);
        res.status(500).json({ message: error.message || 'Server error during check-in' });
    }
};

// @desc    User: Get personal gym check-in pass history
// @route   GET /api/gym/user/history
// @access  Private (User)
const getUserCheckInHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { search, month, year, date } = req.query;

        const query = { userId: req.user._id };

        // Date / Month / Year filter
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.checkInDate = { $gte: start, $lte: end };
        } else if (month && year) {
            const start = new Date(parseInt(year), parseInt(month) - 1, 1);
            const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
            query.checkInDate = { $gte: start, $lte: end };
        } else if (year) {
            const start = new Date(parseInt(year), 0, 1);
            const end = new Date(parseInt(year), 11, 31, 23, 59, 59, 999);
            query.checkInDate = { $gte: start, $lte: end };
        }

        let allRecords = await GymCheckIn.find(query)
            .populate('gymId', 'gymName address photos location')
            .sort({ checkInDate: -1 });

        // Search filter (by gymName, city, or state)
        if (search && search.trim()) {
            const term = search.trim().toLowerCase();
            allRecords = allRecords.filter(item => {
                const name = item.gymId?.gymName?.toLowerCase() || '';
                const city = item.gymId?.address?.city?.toLowerCase() || '';
                const state = item.gymId?.address?.state?.toLowerCase() || '';
                return name.includes(term) || city.includes(term) || state.includes(term);
            });
        }

        const total = allRecords.length;
        const paginatedData = allRecords.slice(skip, skip + limit);

        res.json({
            success: true,
            total,
            count: paginatedData.length,
            page,
            totalPages: Math.ceil(total / limit) || 1,
            hasMore: skip + limit < total,
            data: paginatedData,
        });
    } catch (error) {
        console.error('getUserCheckInHistory error:', error);
        res.status(500).json({ message: error.message || 'Server error fetching history' });
    }
};

module.exports = {
    getNearbyGyms,
    getGymPublicDetails,
    checkInAtGym,
    getUserCheckInHistory,
};
