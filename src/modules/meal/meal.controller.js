const mealService = require('./meal.service');

// @desc    Create a meal plan
// @route   POST /api/meals
// @access  Private (Trainer/Admin)
const createMealPlan = async (req, res) => {
    try {
        const mealPlan = await mealService.createMealPlan(req.body, req.user._id);
        res.status(201).json(mealPlan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all meal plans
// @route   GET /api/meals
// @access  Private (Trainer/Admin)
const getMealPlans = async (req, res) => {
    try {
        const mealPlans = await mealService.getMealPlans({});
        res.json(mealPlans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my meal plans
// @route   GET /api/meals/my-plan
// @access  Private (User)
const getMyMealPlans = async (req, res) => {
    try {
        const mealPlans = await mealService.getMyMealPlans(req.user._id);
        res.json(mealPlans);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get meal plan by ID
// @route   GET /api/meals/:id
// @access  Private
const getMealPlanById = async (req, res) => {
    try {
        const mealPlan = await mealService.getMealPlanById(req.params.id);
        if (mealPlan) {
            res.json(mealPlan);
        } else {
            res.status(404).json({ message: 'Meal plan not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update meal plan
// @route   PUT /api/meals/:id
// @access  Private (Trainer/Admin)
const updateMealPlan = async (req, res) => {
    try {
        const mealPlan = await mealService.updateMealPlan(req.params.id, req.body);
        res.json(mealPlan);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete meal plan
// @route   DELETE /api/meals/:id
// @access  Private (Trainer/Admin)
const deleteMealPlan = async (req, res) => {
    try {
        await mealService.deleteMealPlan(req.params.id);
        res.json({ message: 'Meal plan removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createMealPlan,
    getMealPlans,
    getMyMealPlans,
    getMealPlanById,
    updateMealPlan,
    deleteMealPlan
};
