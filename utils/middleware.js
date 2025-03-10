const mongoose = require('mongoose');
const getDatabaseConnection = require('./database');
const getDynamicModel = require('./dynamicModel');
const modelsMap = require('./modelsMap');

const dbMiddleware = async (req, res, next) => {
  const dsp_code = req.body.dsp_code || req.query.dsp_code || req.params.dsp_code;
  if (!dsp_code) {
    return res.status(500).json({ message: 'dsp_code est requis.' });
  }

  try {
    let connection;

    // Étape 1 : Connexion à MongoDB
    try {
      connection = await getDatabaseConnection(dsp_code);
      // 🔥 Vérification de l'accès interdit
      if (connection && connection.accessDenied) {
        return res.status(499).json({
          message: `Accès interdit pour le DSP code "${dsp_code}".`
        });
      }
      if (!connection) {
        throw new Error('Connexion MongoDB introuvable.');
      }
    } catch (dbError) {
      return res.status(500).json({ message: 'Erreur de connexion à MongoDB.', error: dbError.message });
    }

    // Étape 2 : Vérification de req.requiredModels
    if (!req.requiredModels) {
      req.requiredModels = [];
    }

    // Étape 3 : Initialisation des modèles nécessaires
    try {
      const requiredModels = req.requiredModels;

      requiredModels.forEach((modelName) => {

        // Vérifiez si le modèle existe dans modelsMap
        const schema = modelsMap[modelName];
        if (!schema) {
          throw new Error(`Modèle "${modelName}" introuvable dans modelsMap.`);
        }

        // Vérifiez si le modèle est déjà dans connection.models
        if (!connection.models[modelName]) {
          getDynamicModel(connection, modelName, schema);
        } else {
        }
      });
    } catch (initError) {
      return res.status(500).json({ message: 'Erreur d\'initialisation des modèles.', error: initError.message });
    }

    // Étape 4 : Injection de la connexion dans req
    req.connection = connection;

    next(); // Passer au middleware suivant
  } catch (error) {
    res.status(500).json({
      message: 'Erreur interne dans dbMiddleware.',
      error: error.message,
    });
  }
};

module.exports = dbMiddleware;
