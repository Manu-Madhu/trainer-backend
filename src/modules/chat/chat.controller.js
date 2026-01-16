const chatService = require('./chat.service');

// @desc    Get user conversations
// @route   GET /api/chat/conversations
// @access  Private
const getConversations = async (req, res) => {
    try {
        const conversations = await chatService.getConversations(req.user._id);
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get chat messages with specific user
// @route   GET /api/chat/:userId
// @access  Private
const getChatWithUser = async (req, res) => {
    try {
        const chat = await chatService.getChatWithUser(req.user._id, req.params.userId);
        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send message
// @route   POST /api/chat/send
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { recipientId, content, type } = req.body;
        const result = await chatService.sendMessage(req.user._id, recipientId, content, type);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getConversations,
    getChatWithUser,
    sendMessage
};
