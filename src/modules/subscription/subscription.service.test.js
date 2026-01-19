const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const subscriptionService = require('./subscription.service');
const Payment = require('./payment.model');
const User = require('../user/user.model');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Payment.deleteMany({});
    await User.deleteMany({});
});

describe('Subscription Service', () => {
    describe('getUserPaymentHistory', () => {
        it('should return paginated payment history for a user', async () => {
            const userId = new mongoose.Types.ObjectId();

            // Create some payments
            await Payment.create([
                { user: userId, amount: 500, month: 1, year: 2024, status: 'paid' },
                { user: userId, amount: 500, month: 2, year: 2024, status: 'paid' },
                { user: userId, amount: 500, month: 3, year: 2024, status: 'pending' }
            ]);

            // Test basic fetching
            const result = await subscriptionService.getUserPaymentHistory(userId);
            expect(result.history).toHaveLength(3);
            expect(result.total).toBe(3);
        });

        it('should filter by status', async () => {
            const userId = new mongoose.Types.ObjectId();
            await Payment.create([
                { user: userId, amount: 500, month: 1, year: 2024, status: 'paid' },
                { user: userId, amount: 500, month: 2, year: 2024, status: 'pending' }
            ]);

            const result = await subscriptionService.getUserPaymentHistory(userId, { status: 'paid' });
            expect(result.history).toHaveLength(1);
            expect(result.history[0].status).toBe('paid');
        });

        it('should respect pagination', async () => {
            const userId = new mongoose.Types.ObjectId();
            const payments = Array.from({ length: 15 }, (_, i) => ({
                user: userId,
                amount: 100,
                month: (i % 12) + 1,
                year: 2024 - Math.floor(i / 12),
                status: 'paid'
            }));
            await Payment.insertMany(payments);

            const result = await subscriptionService.getUserPaymentHistory(userId, { page: 1, limit: 10 });
            expect(result.history).toHaveLength(10);
            expect(result.total).toBe(15);

            const page2 = await subscriptionService.getUserPaymentHistory(userId, { page: 2, limit: 10 });
            expect(page2.history).toHaveLength(5);
        });

        it('should filter by date range', async () => {
            const userId = new mongoose.Types.ObjectId();

            // Create a payment with an old date
            const p1 = new Payment({ user: userId, amount: 500, month: 1, year: 2023, status: 'paid' });
            p1.createdAt = new Date('2023-01-01');
            await p1.save();

            // Create a payment with a recent date
            const p2 = new Payment({ user: userId, amount: 500, month: 1, year: 2024, status: 'paid' });
            p2.createdAt = new Date('2024-01-01');
            await p2.save();

            const result = await subscriptionService.getUserPaymentHistory(userId, {
                from: '2023-12-01',
                to: '2024-02-01'
            });

            expect(result.history).toHaveLength(1);
            expect(result.history[0].year).toBe(2024);
        });
    });

    describe('getAdminPaidUsers', () => {
        it('should return users with their payment status', async () => {
            const user1 = await User.create({
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                subscription: { plan: 'premium' }
            });

            const user2 = await User.create({
                name: 'Jane Doe',
                email: 'jane@example.com',
                password: 'password123',
                subscription: { plan: 'premium' }
            });

            // Payment for user 1 this month
            const now = new Date();
            await Payment.create({
                user: user1._id,
                amount: 1000,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                status: 'paid'
            });

            const result = await subscriptionService.getAdminPaidUsers();
            expect(result.users).toHaveLength(2);

            const john = result.users.find(u => u.name === 'John Doe');
            expect(john.currentMonthStatus).toBe('paid');

            const jane = result.users.find(u => u.name === 'Jane Doe');
            expect(jane.currentMonthStatus).toBe('due');
        });
    });

    describe('getAdminStats', () => {
        it('should calculate correct stats', async () => {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            await Payment.create([
                { user: new mongoose.Types.ObjectId(), amount: 1000, month, year, status: 'paid' },
                { user: new mongoose.Types.ObjectId(), amount: 1000, month, year, status: 'paid' },
                { user: new mongoose.Types.ObjectId(), amount: 500, month, year, status: 'pending' },
                // Different month
                { user: new mongoose.Types.ObjectId(), amount: 2000, month: month === 1 ? 12 : month - 1, year, status: 'paid' }
            ]);

            const stats = await subscriptionService.getAdminStats();

            expect(stats.totalEarning).toBe(4000);
            expect(stats.totalPending).toBe(500);
            expect(stats.monthCollection).toBe(2000);
            expect(stats.monthPending).toBe(500);
        });
    });
});
