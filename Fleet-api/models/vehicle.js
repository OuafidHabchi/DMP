const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true },
    model: { type: String, },
    type: { type: String, },
    geotab: { type: String,},
    vin: { type: String, required: true },
    license: { type: String, required: true },
    Location: { type: String },
    status: { type: String },
});

module.exports = vehicleSchema; // Exporter uniquement le schéma
