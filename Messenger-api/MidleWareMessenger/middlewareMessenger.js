const mongoose = require('mongoose');
const getDatabaseConnection = require('../../utils/database'); // Importez votre module global

// Définition des modèles
const conversationSchema = new mongoose.Schema({
  participants: [{ type: String, required: true }],
  isGroup: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  name:{type: String, }
});

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: { type: String },
  fileUrl: { type: String },
  timestamp: { type: Date, default: Date.now },
  readBy: [{ type: mongoose.Schema.Types.ObjectId }],
});

// Middleware principal
const dbMiddlewareMessenger = async (req, res, next) => {
  try {

    // Récupération du DSP code
    const dsp_code = req.body.dsp_code || req.query.dsp_code || req.params.dsp_code;

    if (!dsp_code) {
      return res.status(500).json({ message: 'dsp_code est requis.' });
    }

    // Obtenez la connexion à la base de données
    const connection = await getDatabaseConnection(dsp_code);

    // Ajout des modèles, uniquement si non déjà présents
    if (!connection.models.Conversation) {
      connection.model('Conversation', conversationSchema);
    }
    if (!connection.models.Message) {
      connection.model('Message', messageSchema);
    }

    // Injectez la connexion dans la requête
    req.connection = connection;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erreur de connexion à la base de données.', error: error.message });
  }
};

module.exports = dbMiddlewareMessenger;
