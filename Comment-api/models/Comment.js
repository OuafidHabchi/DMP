const mongoose = require('mongoose');

// Définition du schéma
const commentSchema = new mongoose.Schema({
  idEmploye: { type: String, required: true}, // Référence au modèle Employee
  date: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Par défaut : date actuelle
  comment: { type: String, required: true },
});

// Exporter uniquement le schéma
module.exports = commentSchema;
