const mongoose = require('mongoose');

// 🎨 Schéma pour InvitationLink
const invitationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
      },
      dsp_code: {
        type: String,
        required: true,
      },
      fonctionnel: {
        type: Boolean,
        default: true,
      },
      dateCreation: {
        type: Date,
        default: Date.now,
      },
    });

module.exports = invitationSchema; // Exportez le schéma (PAS un modèle)
