// models/EquipmentUpdate.js
const mongoose = require('mongoose');

const equipmentUpdateSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  vanName:      { type: String, required: true },
  localTime:    { type: String, required: true },
  // ✅ Nouveau champ Spaces
  imageUrl:     { type: String, required: true },

  // (optionnel) compat ancienne version locale
  imagePath:    { type: String }, 

  userId:       { type: String, required: true },
  photoType:    { type: String, required: true },
  day:          { type: String, required: true },
}, { timestamps: true });

module.exports = equipmentUpdateSchema;
