const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const subscriptionRoutes = require('./subscription.routes');
const User = require('../user/user.model');
const Payment = require('./payment.model');
const jwt = require('jsonwebtoken');

const secret = 'test_secret';
process.env.JWT_SECRET = secret;

let mongoServer;
let app;
let adminToken;
let adminUser;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = express();
    app.use(express.json());
    app.use('/api/subscriptions', subscriptionRoutes);

    // Create Admin User
    adminUser = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
    });

    adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, secret);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
});

describe('Subscription Controller API', () => {
    describe('GET /api/subscriptions/admin/stats', () => {
        it('should return 401 if not authenticated', async () => {
            const res = await request(app).get('/api/subscriptions/admin/stats');
            expect(res.status).toBe(401);
        });

        it('should return stats for admin', async () => {
            const res = await request(app)
                .get('/api/subscriptions/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('totalEarning');
            expect(res.body).toHaveProperty('monthCollection');
        });
    });

    describe('GET /api/subscriptions/history/:userId', () => {
        it('should return payment history with pagination', async () => {
            const userId = new mongoose.Types.ObjectId();
            await Payment.create({
                user: userId,
                amount: 1000,
                month: 1,
                year: 2024,
                status: 'paid'
            });

            const res = await request(app)
                .get(`/api/subscriptions/history/${userId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.history).toHaveLength(1);
            expect(res.body.total).toBe(1);
        });

        it('should filter history by status', async () => {
            const userId = new mongoose.Types.ObjectId();
            await Payment.create([
                { user: userId, amount: 500, month: 1, year: 2024, status: 'paid' },
                { user: userId, amount: 500, month: 2, year: 2024, status: 'pending' }
            ]);

            const res = await request(app)
                .get(`/api/subscriptions/history/${userId}?status=paid`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.history).toHaveLength(1);
            expect(res.body.history[0].status).toBe('paid');
        });

        it('should filter history by date range and search', async () => {
            const userId = new mongoose.Types.ObjectId();
            const p1 = new Payment({
                user: userId, amount: 500, month: 1, year: 2024, status: 'paid', notes: 'FindMe'
            });
            p1.createdAt = new Date('2024-01-10');
            await p1.save();

            const p2 = new Payment({
                user: userId, amount: 500, month: 2, year: 2024, status: 'paid', notes: 'Other'
            });
            p2.createdAt = new Date('2024-02-10');
            await p2.save();

            const res = await request(app)
                .get(`/api/subscriptions/history/${userId}?search=FindMe&from=2024-01-01&to=2024-01-20`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.history).toHaveLength(1);
            expect(res.body.history[0].notes).toBe('FindMe');
        });
    });
});
