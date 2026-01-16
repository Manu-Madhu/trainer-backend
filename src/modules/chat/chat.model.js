const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    createdAt: { type: Date, default: Date.now },
});

const chatSchema = mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            }
        ],
        messages: [messageSchema],
        lastMessage: {
            content: String,
            createdAt: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
