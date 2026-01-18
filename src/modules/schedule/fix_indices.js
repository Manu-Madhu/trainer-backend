const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const checkIndices = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trainer');
        console.log('Connected to MongoDB');

        const Schedule = require('./schedule.model');
        const indices = await Schedule.collection.getIndexes();
        console.log('Current Indices:', JSON.stringify(indices, null, 2));

        // Check for the old global unique index
        const indexNames = Object.keys(indices);
        const oldIndexName = indexNames.find(name =>
            name.includes('date_1_isGlobal_1') && !name.includes('isPublic')
        );

        if (oldIndexName) {
            console.log(`Found old index: ${oldIndexName}. Dropping it...`);
            await Schedule.collection.dropIndex(oldIndexName);
            console.log('Old index dropped successfully.');
        } else {
            console.log('No old index found that needs dropping.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkIndices();
