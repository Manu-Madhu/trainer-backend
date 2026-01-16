const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { protect } = require('../../middleware/authMiddleware');

router.get('/conversations', protect, chatController.getConversations);
router.get('/:userId', protect, chatController.getChatWithUser);
router.post('/send', protect, chatController.sendMessage);

module.exports = router;
