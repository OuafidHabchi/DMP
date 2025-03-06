const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  dsp_code :{ type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  email: { type: String, required: true },
  tel: { type: String, required: true },
  read: { type: Boolean, default: false },
  fixer: { type: Boolean, default: false }
  
}, { timestamps: true });

module.exports = contactSchema ;