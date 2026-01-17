const express = require('express');
const router = express.Router();
const userController = require('./user.controller');

router.get('/', userController.getUsers);
router.post('/', userController.registerUser);
router.patch('/:id/block', userController.toggleBlockStatus);

module.exports = router;
