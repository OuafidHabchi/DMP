const mongoose = require('mongoose');

const dailyViolationSchema = new mongoose.Schema({
  employeeId: { type: String, required: true }, // Référence au modèle Employee
  type: { type: String, required: true },
  link: { type: String, required: true },
  description: { type: String },
  createdBy: { type: String, required: true }, // Référence au créateur
  date: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Par défaut : aujourd'hui
  seen: { type: Boolean, default: false }, // Par défaut : non vu
});

module.exports = dailyViolationSchema;
