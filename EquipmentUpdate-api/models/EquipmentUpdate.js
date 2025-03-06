const mongoose = require('mongoose');

const equipmentUpdateSchema = new mongoose.Schema({
  employeeName: { type: String, required: true },
  vanName: { type: String, required: true },
  localTime: { type: String, required: true },
  imagePath: { type: String, required: true }, // Chemin de l'image
  userId: { type: String, required: true }, 
  photoType: { type: String, required: true }, 
  day: { type: String, required: true }, 

}); // Ajout des timestamps pour createdAt et updatedAt

module.exports = equipmentUpdateSchema;
