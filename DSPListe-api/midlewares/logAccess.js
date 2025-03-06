// 📁 middlewares/logAccess.js
const mongoose = require('mongoose');
const connectToDSP = require('../config/database'); // Import de la connexion DSP

// Cache des modèles de logs
let isConnected = false;

// Définir le schéma pour les logs
const logSchema = new mongoose.Schema({
    dspCode: String,
    url: String,
    method: String,
    statusCode: Number,
    responseTime: Number,
    path: String,
    queryParams: Object,
    params: Object,
    host: String,
    userAgent: String,
    ipAddress: String,
    timestamp: { type: Date, default: Date.now }
});

/**
 * Récupère ou crée un modèle de log pour un DSP donné
 * @param {string} dspCode - Le code du DSP
 * @returns {mongoose.Model} - Modèle de log pour ce DSP
 */
const getLogModel = async (dspCode) => {
    if (!isConnected) {
        await connectToDSP(); // Connexion à la base DSP
        isConnected = true;
    }

    const modelName = `Log_${dspCode}`;

    // Utilisation de mongoose.models pour vérifier le cache global
    if (mongoose.models[modelName]) {
        return mongoose.models[modelName]; // Si le modèle existe déjà, on le réutilise
    } else {
        return mongoose.model(modelName, logSchema, `Logs_${dspCode}`); // Sinon, on le crée
    }
};

const logAccess = async (req, res, next) => {
    const dspCode = req.query.dsp_code || 'unknown'; // Extraction du dspCode
    const Log = await getLogModel(dspCode); // Récupération du modèle spécifique au DSP
    const startTime = Date.now();

    // Après la réponse, on enregistre le log
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        const log = new Log({
            dspCode,
            url: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            responseTime,
            path: req.path,
            queryParams: req.query,
            params: req.params,
            host: req.get('host'),
            userAgent: req.get('user-agent'),
            ipAddress: req.ip
        });

        // Utilisation de Fire and Forget pour ne pas impacter les performances
        log.save().catch(error => console.error('Erreur lors de l\'enregistrement du log :', error.message));
    });

    next();
};

module.exports = logAccess;
