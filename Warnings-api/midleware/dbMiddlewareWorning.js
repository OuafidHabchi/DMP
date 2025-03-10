const mongoose = require('mongoose');
const getDatabaseConnection = require('../../utils/database');
const worningSchema = require('../models/worning');

// Middleware personnalisé pour la gestion des warnings
const dbMiddlewareWorning = async (req, res, next) => {
  try {
    // Récupération du DSP code
    const dsp_code = req.body.dsp_code || req.query.dsp_code || req.params.dsp_code;

    if (!dsp_code) {
      return res.status(500).json({ message: 'dsp_code est requis.' });
    }

    // Obtenez la connexion à la base de données
    const connection = await getDatabaseConnection(dsp_code);

    // Ajout du modèle Worning, uniquement si non déjà présent
    if (!connection.models.Worning) {
      connection.model('Worning', worningSchema);
    }

    // Injectez la connexion dans la requête
    req.connection = connection;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Erreur de connexion à la base de données.', error: error.message });
  }
};

module.exports = dbMiddlewareWorning;
