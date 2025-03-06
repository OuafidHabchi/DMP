const mongoose = require('mongoose');

// Définition du schéma pour les disponibilités
const disponibiliteSchema = new mongoose.Schema({
  employeeId: { type: String, required: true }, // Référence au modèle Employee
  selectedDay: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Par défaut : date actuelle
  shiftId: {type: String, required: true }, // Référence au modèle Shift
  decisions: { type: String }, // Décisions (optionnel)
  confirmation: { type: String }, // Confirmation (optionnel)
  presence: { type: String }, // Présence (optionnel)
  expoPushToken: { type: String }, // Token pour les notifications push (optionnel)
  suspension:{type:Boolean},
  seen: {type:Boolean}
});

// Exporter uniquement le schéma
module.exports = disponibiliteSchema;
