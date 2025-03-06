const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: String, required: true },
    duration: { type: String }, // en minutes
    heur: { type: String, required: true }, // par exemple "14:30"
    Link: { type: String, required: true },
    invitedGuests: [{ type: String }], // liste de noms ou emails
    createdBy: { type: String, required: true },
}, { timestamps: true });

module.exports = eventSchema; // Exporter le schéma
