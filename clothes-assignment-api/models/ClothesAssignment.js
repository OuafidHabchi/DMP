const mongoose = require('mongoose');

// Définition du schéma
const clothesAssignmentSchema = new mongoose.Schema({
  clothesId: { type: String, required: true}, // Référence au modèle Clothes
  employeeId: { type: String, required: true }, // Référence au modèle Employee
  quantite: { type: Number, required: true },
  date: { type: Date, default: Date.now }, // Par défaut : date actuelle
  createdBy: { type: String, required: true },
});

// Exporter uniquement le schéma
module.exports = clothesAssignmentSchema;
