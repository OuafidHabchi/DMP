const mongoose = require('mongoose');

// Définition du schéma pour les cartes de carburant
const fuelCardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true },
  pin: { type: String },
  linkedType: { type: String, enum: ['vehicle', 'employee'], required: true },
  linkedId: { type: String, required: true },
  functional: { type: Boolean, default: true },
  comment: { type: String }
});

module.exports = fuelCardSchema;
