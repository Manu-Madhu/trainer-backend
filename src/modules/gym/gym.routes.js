const express = require('express');
const router = express.Router();
const { protect, admin, gym } = require('../../middleware/authMiddleware');

const gymAdminController = require('./gymAdmin.controller');
const gymPartnerController = require('./gym.controller');
const gymUserController = require('./gymUser.controller');

// ==========================================
// ADMIN ROUTES
// ==========================================
router.post('/admin/onboard', protect, admin, gymAdminController.onboardGym);
router.get('/admin/all', protect, admin, gymAdminController.getAllGyms);
router.get('/admin/settlements/summary', protect, admin, gymAdminController.getSettlementsSummary);
router.get('/admin/:id', protect, admin, gymAdminController.getGymById);
router.put('/admin/:id', protect, admin, gymAdminController.updateGym);
router.post('/admin/:id/settle', protect, admin, gymAdminController.settleGymPayout);

// ==========================================
// GYM PARTNER ROUTES
// ==========================================
router.get('/partner/dashboard', protect, gym, gymPartnerController.getGymDashboard);
router.get('/partner/qr-code', protect, gym, gymPartnerController.getGymQRCode);
router.get('/partner/check-ins', protect, gym, gymPartnerController.getGymCheckIns);
router.get('/partner/settlements', protect, gym, gymPartnerController.getGymSettlements);
router.put('/partner/profile', protect, gym, gymPartnerController.updateGymProfile);

// ==========================================
// USER ROUTES (Platinum Traveler)
// ==========================================
router.get('/nearby', protect, gymUserController.getNearbyGyms);
router.get('/details/:id', protect, gymUserController.getGymPublicDetails);
router.post('/check-in', protect, gymUserController.checkInAtGym);
router.get('/user/history', protect, gymUserController.getUserCheckInHistory);

module.exports = router;
