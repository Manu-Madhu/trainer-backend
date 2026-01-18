const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/authMiddleware');
const { createSchedule, getSchedules, deleteSchedule } = require('./schedule.controller');

router.route('/')
    .post(protect, admin, createSchedule)
    .get(protect, getSchedules);

router.route('/:id')
    .delete(protect, admin, deleteSchedule);

module.exports = router;
