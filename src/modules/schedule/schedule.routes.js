const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');
const { createSchedule, getSchedules } = require('./schedule.controller');

router.route('/')
    .post(protect, admin, createSchedule)
    .get(protect, getSchedules);

module.exports = router;
