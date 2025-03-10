// 📁 config/adminDatabase.js
const mongoose = require('mongoose');

// Importation depuis le service DSPliste
const { getDatabaseMap } = require('../services/dspService');

// Cache des connexions existantes (ADMIN)
const adminConnections = {};

/**
 * Établit ou réutilise une connexion MongoDB dynamique (ADMIN)
 * ⚠️ Cette fonction IGNORE l'attribut Access
 * @param {string} dsp_code - Code DSP pour mapper à la base de données
 * @returns {mongoose.Connection} - Connexion MongoDB (ADMIN)
 */
const getAdminDatabaseConnection = async (dsp_code) => {
  // Utilisation directe du databaseMap récupéré depuis le service
  const databaseMap = getDatabaseMap();
  const dspInfo = databaseMap[dsp_code];

  // Vérification du DSP code (sans vérifier Access)
  if (!dspInfo) {
    throw new Error(`DSP code "${dsp_code}" introuvable dans le mapping.`);
  }

  const dbName = dspInfo.DataBase;

  // Réutiliser une connexion existante si elle est prête
  if (adminConnections[dbName] && adminConnections[dbName].readyState === 1) {
    return adminConnections[dbName];
  }

  // Initialiser une nouvelle connexion si nécessaire
  const uri = `mongodb+srv://wafid:wafid@ouafid.aihn5iq.mongodb.net/${dbName}`;
  const poolSize = process.env.NODE_ENV === 'production' ? 50 : 10; // Taille du pool

  try {
    const connection = mongoose.createConnection(uri, {
      maxPoolSize: poolSize,
      serverSelectionTimeoutMS: 30000, // Timeout de sélection
    });

    // Connexion réussie
    connection.on('connected', () => {
      console.log(`✅ Connexion ADMIN établie à la base : ${dbName}`);
    });

    // Déconnexion automatique
    connection.on('disconnected', () => {
      console.log(`⚠️ Déconnexion automatique de la base (ADMIN) : ${dbName}`);
    });

    // Erreur de connexion
    connection.on('error', (err) => {
      console.log(`❌ Erreur de connexion (ADMIN) (${dbName}) :`, err.message);
      delete adminConnections[dbName];
    });

    // Nettoyage automatique après 10 minutes d'inactivité
    setTimeout(() => {
      if (connection.readyState === 1) {
        connection.close().then(() => {
          console.log(`🛑 Connexion ADMIN fermée pour inactivité (${dbName}).`);
        });
        delete adminConnections[dbName];
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Désactiver les commandes en mémoire tampon
    connection.set('bufferCommands', false);

    // Ajouter au cache
    adminConnections[dbName] = connection;

    return connection;
  } catch (error) {
    console.log(`Erreur lors de la connexion ADMIN à ${dbName} :`, error.message);
    throw new Error(`Connexion ADMIN à ${dbName} échouée : ${error.message}`);
  }
};

module.exports = {
  getAdminDatabaseConnection
};
