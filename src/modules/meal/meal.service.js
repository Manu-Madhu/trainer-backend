const MealPlan = require('./meal.model');

const createMealPlan = async (data, creatorId) => {
    const mealPlan = new MealPlan({
        ...data,
        createdBy: creatorId
    });
    return await mealPlan.save();
};

const getMealPlans = async (query) => {
    return await MealPlan.find(query);
};

const getMealPlanById = async (id) => {
    return await MealPlan.findById(id);
};

const updateMealPlan = async (id, data) => {
    return await MealPlan.findByIdAndUpdate(id, data, { new: true });
};

const deleteMealPlan = async (id) => {
    return await MealPlan.findByIdAndDelete(id);
};

const getMyMealPlans = async (userId) => {
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
