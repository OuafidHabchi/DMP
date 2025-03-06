// /models/conversationModel.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: String, required: true }],  // Liste des employeeIds participant à la conversation
  isGroup: { type: Boolean, default: false },  // Conversation privée ou de groupe
  createdAt: { type: Date, default: Date.now },
  
});

module.exports = conversationSchema;