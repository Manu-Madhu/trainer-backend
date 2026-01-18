const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');
const { createSchedule, getSchedules, deleteSchedule, getMySchedule, syncGlobalSchedules } = require('./schedule.controller');

router.get('/my', protect, getMySchedule);
router.post('/sync-global', protect, admin, syncGlobalSchedules);

router.route('/')
    .post(protect, admin, createSchedule)
    .get(protect, getSchedules);

router.route('/:id')
    .delete(protect, admin, deleteSchedule);

module.exports = router;
