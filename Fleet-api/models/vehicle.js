// ... (imports mongoose existants)
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true },
  model: { type: String },
  type: { type: String },
  geotab: { type: String },
  vin: { type: String, required: true },
  license: { type: String, required: true },
  Location: { type: String },
  status: { type: String },

  // 👇 AJOUTER CE CHAMP
  documents: [
    {
      fileName: { type: String, required: true },
      url:      { type: String, required: true },
      type:     { type: String, required: true }, // MIME ex: application/pdf, image/jpeg
      // Pas de "key" stockée (tu l'as demandé), on la reconstruit depuis l'URL à la suppression
      _id:      { type: mongoose.Schema.Types.ObjectId, auto: true }, // id du doc
    }
  ],
}, { timestamps: true });

module.exports = vehicleSchema;
