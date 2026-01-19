const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const MealPlan = require('./src/modules/meal/meal.model');

async function testMealCreation() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        const mockCreatorId = new mongoose.Types.ObjectId(); // Dummy ID for testing

        const planData = {
            title: "Test Plan 101",
            calories: "2000",
            level: "beginner",
            isPublic: true,
            description: "A test plan",
            meals: [
                {
                    name: "Breakfast",
                    time: "08:00 AM",
                    calories: "500",
                    items: [
                        { name: "Egg", quantity: "2" }
                    ],
                    media: [
                        { type: "image", url: "https://example.com/egg.jpg", name: "egg" }
                    ]
                }
            ],
            media: [
                { type: "image", url: "https://example.com/cover.jpg", name: "cover" }
            ],
            createdBy: mockCreatorId
        };

        console.log('Validating plan data...');
        const mealPlan = new MealPlan(planData);

        // Use validate() to check for schema errors without saving
        await mealPlan.validate();
        console.log('Validation successful!');

        // If validation passes, we can try to save (and then delete immediately)
        // const saved = await mealPlan.save();
        // console.log('Save successful! ID:', saved._id);
        // await MealPlan.findByIdAndDelete(saved._id);
        // console.log('Test record cleaned up.');

    } catch (error) {
        console.error('TEST FAILED');
        if (error.errors) {
            Object.keys(error.errors).forEach(key => {
                console.error(`- Field "${key}": ${error.errors[key].message}`);
            });
        } else {
            console.error(error);
        }
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

testMealCreation();
