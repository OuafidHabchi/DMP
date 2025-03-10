const mongoose = require('mongoose');

// Importation depuis le service DSPliste
const { getDatabaseMap } = require('../DSPListe-api/services/dspService');

// Cache des connexions existantes
const connections = {};

/**
 * Établit ou réutilise une connexion MongoDB dynamique
 * @param {string} dsp_code - Code DSP pour mapper à la base de données
 * @returns {mongoose.Connection} - Connexion MongoDB
 */
const getDatabaseConnection = async (dsp_code) => {
  // Utilisation directe du databaseMap récupéré depuis le service
  const databaseMap = getDatabaseMap();
  const dspInfo = databaseMap[dsp_code];

  // Vérification du DSP code et du statut Access
  if (!dspInfo) {
    throw new Error(`DSP code "${dsp_code}" introuvable dans le mapping.`);
  }
  
  if (!dspInfo.Access) {
    console.log(`Accès interdit pour le DSP code "${dsp_code}"`);
    // 🚨 On retourne un objet spécial pour signaler l'accès interdit
    return { accessDenied: true };
  }

  

  const dbName = dspInfo.DataBase;

  // Réutiliser une connexion existante si elle est prête
  if (connections[dbName] && connections[dbName].readyState === 1) {
    return connections[dbName];
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
      console.log(`✅ Connexion établie à la base : ${dbName}`);
    });

    // Déconnexion automatique
    connection.on('disconnected', () => {
      console.log(`⚠️ Déconnexion automatique de la base : ${dbName}`);
    });

    // Erreur de connexion
    connection.on('error', (err) => {
      console.log(`❌ Erreur de connexion (${dbName}) :`, err.message);
      delete connections[dbName];
    });

    // Nettoyage automatique après 10 minutes d'inactivité
    setTimeout(() => {
      if (connection.readyState === 1) {
        connection.close().then(() => {
          console.log(`🛑 Connexion fermée pour inactivité (${dbName}).`);
        });
        delete connections[dbName];
      }
    }, 10 * 60 * 1000); // 10 minutes

    // Désactiver les commandes en mémoire tampon
    connection.set('bufferCommands', false);

    // Ajouter au cache
    connections[dbName] = connection;

    return connection;
  } catch (error) {
    console.log(`Erreur lors de la connexion à ${dbName} :`, error.message);
    throw new Error(`Connexion à ${dbName} échouée : ${error.message}`);
  }
};

// Nettoyage des connexions à la fin
process.on('SIGINT', async () => {
  console.log('Fermeture des connexions MongoDB...');
  const closePromises = Object.values(connections).map(async (conn) => {
    try {
      await conn.close();
      console.log(`✅ Connexion fermée proprement pour la base : ${conn.name}`);
    } catch (err) {
      console.log(`❌ Erreur lors de la fermeture de la connexion : ${conn.name}`, err.message);
    }
  });
  await Promise.all(closePromises);
  console.log('Toutes les connexions MongoDB ont été fermées.');
  process.exit(0);
});

module.exports = getDatabaseConnection;
