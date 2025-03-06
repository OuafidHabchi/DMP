const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['Vehicle', 'Phone', 'Battery'] },
    name: { type: String, required: true },
    key: { type: Boolean, default: false }, // Specific to Vehicles
    shellCard: { type: Boolean, default: false }, // Specific to Vehicles
    paper: { type: Boolean, default: false }, // Specific to Vehicles
    cable: { type: Boolean, default: false }, // Specific to Vehicles
    exists: { type: Boolean, default: false }, // Specific to Phones and Batteries
    status: { type: String, default: "" },
});

module.exports = inventoryItemSchema; // Exporter le schéma pour un modèle dynamique
