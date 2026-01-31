const MealPlan = require('./meal.model');
const Schedule = require('../schedule/schedule.model');

const createMealPlan = async (data, creatorId) => {
    const mealPlan = new MealPlan({
        ...data,
        createdBy: creatorId
    });
    return await mealPlan.save();
};

const getMealPlans = async (query) => {
    const { page = 1, limit = 10, search, level, isPublic } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
        filter.title = { $regex: search, $options: 'i' };
    }
    if (level && level !== 'all') {
        filter.level = level;
    }
    if (isPublic !== undefined) {
        filter.isPublic = isPublic === 'true';
    }

    const meals = await MealPlan.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await MealPlan.countDocuments(filter);

    return {
        meals,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
    };
};

const getMealPlanById = async (id) => {
    return await MealPlan.findById(id);
};

const updateMealPlan = async (id, data) => {
    return await MealPlan.findByIdAndUpdate(id, data, { new: true });
};

const deleteMealPlan = async (id) => {
    // 1. Delete associated schedules first
    await Schedule.deleteMany({ mealPlan: id });

    // 2. Delete the meal plan itself
    return await MealPlan.findByIdAndDelete(id);
};

const getMyMealPlans = async (user) => {
    const userId = user._id || user;
    const isExpired = user.subscription && user.subscription.status === 'expired';

    if (isExpired) {
        // EXPIRED USERS: Only Public Meals (if any) or nothing.
        // Assuming we want to show public meals if they exist, or empty array if we don't have public meals concept fully active yet.
        // Let's copy Workout logic: try finding Public ones.
        return await MealPlan.find({ isPublic: true });
    }

    return await MealPlan.find({ assignedTo: userId });
};

module.exports = {
    createMealPlan,
    getMealPlans,
    getMealPlanById,
    updateMealPlan,
    deleteMealPlan,
    getMyMealPlans
};
