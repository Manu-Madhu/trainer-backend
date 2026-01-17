const express = require('express');
const router = express.Router();
const userController = require('./user.controller');

const upload = require('../../middleware/upload');

router.get('/', userController.getUsers);
router.post('/', upload.single('avatar'), userController.registerUser);
router.patch('/:id/block', userController.toggleBlockStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
