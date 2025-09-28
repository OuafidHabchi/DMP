const mongoose = require('mongoose');

const violationTemplateSchema = new mongoose.Schema({
  type: { type: String, required: true },        // Sert à la fois de type & nom du template
  link: { type: String },                        // Lien vers vidéo ou autre (optionnel)
  description: { type: String },                 // Texte complémentaire (optionnel)
}, {
  timestamps: true // createdAt, updatedAt
});

module.exports = violationTemplateSchema;
