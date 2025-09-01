// Factures-api/models/FactureSchema.js
const mongoose = require('mongoose');

const FactureSchema = new mongoose.Schema({
  name: { type: String, required: true },

  // ✅ nouvelle source de vérité (Spaces/CDN)
  fileUrl: { type: String, required: false },

  // (optionnel) compat hérité — NE PAS required
  filePath: { type: String },

  createdBy: { type: String, required: true },
  note: { type: String },
  createdAt: { type: String, required: true },
});

module.exports = FactureSchema;
