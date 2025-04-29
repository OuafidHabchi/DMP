const mongoose = require('mongoose');

const FactureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  filePath: {
    type: String, // lien vers l'image ou pdf de la facture
    required: true,
  },
  createdBy: {
    type: String, // ID de l'utilisateur qui a créé la facture
    required: true,
  },
  note: {
    type: String, // ID de l'utilisateur qui a créé la facture
  },
  createdAt: {
    type: String,
    required: true,

    
  },
});
module.exports = FactureSchema; // Exporter le schéma pour l'utiliser dans d'autres fichiers
