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
process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret';
process.env.RAZORPAY_KEY_ID = 'test_razorpay_key';

jest.mock('../../config/razorpay', () => ({
    orders: {
        create: jest.fn().mockResolvedValue({
            id: 'order_test_123',
            amount: 50000,
            currency: 'INR'
        })
    }
}));

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

    describe('Razorpay Flow API', () => {
        const crypto = require('crypto');
        let userToken;
        let testUser;

        beforeEach(async () => {
            testUser = await User.create({
                name: 'Regular Member',
                email: `user_${Date.now()}@example.com`,
                password: 'password123',
                role: 'user'
            });
            userToken = jwt.sign({ id: testUser._id, role: 'user' }, secret);
        });

        it('POST /api/subscriptions/razorpay/create-order should return order details', async () => {
            const res = await request(app)
                .post('/api/subscriptions/razorpay/create-order')
                .set('Authorization', `Bearer ${userToken}`)
                .send({});

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('orderId', 'order_test_123');
            expect(res.body).toHaveProperty('amount', 50000);
            expect(res.body).toHaveProperty('keyId');

            // Verify a pending payment was created in database
            const payment = await Payment.findOne({ razorpayOrderId: 'order_test_123' });
            expect(payment).toBeTruthy();
            expect(payment.status).toBe('pending');
            expect(payment.method).toBe('razorpay');
        });

        it('POST /api/subscriptions/razorpay/verify should verify valid signature and activate premium', async () => {
            // First create the pending order
            await request(app)
                .post('/api/subscriptions/razorpay/create-order')
                .set('Authorization', `Bearer ${userToken}`)
                .send({});

            const paymentId = 'pay_test_456';
            const orderId = 'order_test_123';
            const validSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            const res = await request(app)
                .post('/api/subscriptions/razorpay/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_signature: validSignature
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.subscription.status).toBe('active');
            expect(res.body.subscription.plan).toBe('premium');

            // Check database
            const updatedUser = await User.findById(testUser._id);
            expect(updatedUser.subscription.status).toBe('active');
            expect(updatedUser.subscription.plan).toBe('premium');

            const updatedPayment = await Payment.findOne({ razorpayOrderId: orderId });
            expect(updatedPayment.status).toBe('paid');
            expect(updatedPayment.razorpayPaymentId).toBe(paymentId);
        });

        it('POST /api/subscriptions/razorpay/verify should reject invalid signature', async () => {
            const res = await request(app)
                .post('/api/subscriptions/razorpay/verify')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    razorpay_order_id: 'order_test_123',
                    razorpay_payment_id: 'pay_test_456',
                    razorpay_signature: 'invalid_signature_hash'
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Invalid payment signature');
        });
    });
});

