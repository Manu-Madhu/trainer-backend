const mongoose = require('mongoose');

const foodItemSchema = mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: String, required: true }, // e.g. "100g", "1 cup"
    calories: { type: Number },
    protein: { type: Number },
    carbs: { type: Number },
    fats: { type: Number },
});

const mealSchema = mongoose.Schema({
    name: { type: String, required: true }, // e.g. "Oatmeal with Berries"
    type: {
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        required: true,
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
    },
    items: [foodItemSchema],
    totalCalories: { type: Number },
    image: { type: String },
    instructions: { type: String },
});

const mealPlanSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        meals: [mealSchema],
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        },
        calories: {
            type: String,
        },
        media: [{
            id: String,
            type: { type: String },
            name: String,
            url: String,
            uri: String
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        assignedTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
        isPublic: {
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    }
);

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);

module.exports = MealPlan;
