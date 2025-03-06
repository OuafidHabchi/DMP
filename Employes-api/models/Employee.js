const mongoose = require('mongoose');

const employeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  familyName: { type: String, required: true },
  tel: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  scoreCard: { type: String, required: true },
  focusArea: { type: String },
  Transporter_ID: { type: String },
  expoPushToken: { type: String },
  quiz: { type: Boolean },
  language: { type: String },
  dsp_code: { type: String },
});

module.exports = employeSchema; // Exportez le schéma (PAS un modèle)
