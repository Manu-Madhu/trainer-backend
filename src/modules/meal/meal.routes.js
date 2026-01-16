const express = require('express');
const router = express.Router();
const mealController = require('./meal.controller');
const { protect, trainer } = require('../../middleware/authMiddleware');

router.route('/')
    .get(protect, trainer, mealController.getMealPlans)
    .post(protect, trainer, mealController.createMealPlan);

router.get('/my-plan', protect, mealController.getMyMealPlans);

router.route('/:id')
    .get(protect, mealController.getMealPlanById)
    .put(protect, trainer, mealController.updateMealPlan)
    .delete(protect, trainer, mealController.deleteMealPlan);

module.exports = router;
