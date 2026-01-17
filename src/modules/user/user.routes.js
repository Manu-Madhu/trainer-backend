const express = require('express');
const router = express.Router();
const userController = require('./user.controller');

const upload = require('../../middleware/upload');

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', upload.single('avatar'), userController.registerUser);
router.patch('/:id/block', userController.toggleBlockStatus);
router.delete('/:id', userController.deleteUser);
router.put('/:id', upload.single('avatar'), userController.updateUser);

module.exports = router;
