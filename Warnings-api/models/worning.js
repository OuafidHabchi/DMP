const mongoose = require('mongoose');

const worningSchema = new mongoose.Schema({
    employeID: { type: String },
    type: { type: String, required: true },
    raison: { type: String, required: true },
    focus: { type: String },
    description: { type: String, required: true },
    date: { type: String },
    link: { type: String },
    severity: { type: String },
    read: { type: Boolean, default: false },
    signature: { type: Boolean, default: false },
    photo: { type: String }, // Le chemin du fichier sera stocké ici
    template: { type: Boolean },
    susNombre: {
        type: [String], // Ceci stockera un tableau d'IDs de disponibilités suspendues
        default: []
    },
});

module.exports = worningSchema;
