// 📁 models/accessLogModel.js
const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
    dsp_code: { type: String, required: true },
    date: { type: Date, default: Date.now },
    ip: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true }
});

module.exports = mongoose.model('AccessLog', accessLogSchema, 'access_logs');
