const mongoose = require('mongoose');

// Définition du schéma pour les disponibilités
const disponibiliteSchema = new mongoose.Schema({
  employeeId: { type: String, required: true }, // Référence au modèle Employee
  selectedDay: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Par défaut : date actuelle
  shiftId: { type: String, }, // Référence au modèle Shift
  publish: { type: Boolean },
  confirmation: { type: Boolean }, // Confirmation (optionnel)
  canceled: { type: Boolean },
  suspension: { type: Boolean },
  seen: { type: Boolean },
  partnerType: { type: String},      // "helper" | "replacement"
partnerEmployeeId: { type: String } // _id de l'employé lié

});

// Exporter uniquement le schéma
module.exports = disponibiliteSchema;
