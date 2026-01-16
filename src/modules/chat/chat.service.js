const Chat = require('./chat.model');

const getConversations = async (userId) => {
    return await Chat.find({ participants: userId })
        .populate('participants', 'name avatar role')
        .sort({ 'lastMessage.createdAt': -1 });
};

const getChatWithUser = async (currentUserId, targetUserId) => {
    let chat = await Chat.findOne({
        participants: { $all: [currentUserId, targetUserId] },
    }).populate('messages.sender', 'name avatar');

    if (!chat) {
        // Create new chat if n/a
        chat = new Chat({
            participants: [currentUserId, targetUserId],
            messages: []
        });
        await chat.save();
    }

    return chat;
};

const sendMessage = async (senderId, recipientId, content, type) => {
    let chat = await Chat.findOne({
        participants: { $all: [senderId, recipientId] },
    });

    if (!chat) {
        chat = new Chat({
            participants: [senderId, recipientId],
            messages: []
        });
    }

    const newMessage = {
        sender: senderId,
        content,
        type,
        createdAt: new Date()
    };

    chat.messages.push(newMessage);
    chat.lastMessage = {
        content: type === 'image' ? 'Image sent' : content,
        createdAt: new Date()
    };

    return await chat.save();
};

module.exports = {
    getConversations,
    getChatWithUser,
    sendMessage
};
