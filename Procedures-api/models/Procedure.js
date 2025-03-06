const mongoose = require('mongoose');

// Modèle de Procedure
const ProcedureSchema = new mongoose.Schema({
    name: { type: String, required: true },
    content: { type: String, required: true },
    link: { type: String},
    date: { type: String, required: true },
    createdBy: { type: String, required: true },
    seen: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // Liste des IDs
});

module.exports = ProcedureSchema
