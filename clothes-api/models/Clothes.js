const mongoose = require('mongoose');

// Définition du schéma
const clothesSchema = new mongoose.Schema({
  type: { type: String, required: true },
  size: { type: String, required: true },
  quantite: { type: Number, required: true },
  date: { type: String, required: true, default: () => new Date().toISOString().split('T')[0] }, // Par défaut : aujourd'hui
  createdBy: { type: String, required: true },
});

// Exporter uniquement le schéma
module.exports = clothesSchema;
