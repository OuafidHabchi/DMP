const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const powerBankController = require('../controllers/powerBankController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['PowerBank'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes powerbanks
router.use(dbMiddleware);

// Créer un nouveau powerbank
router.post('/powerbanks', powerBankController.createPowerBank);

// Obtenir tous les powerbanks
router.get('/powerbanks', powerBankController.getAllPowerBanks);

// Obtenir un powerbank par ID
router.get('/powerbanks/:id', powerBankController.getPowerBankById);

// Mettre à jour un powerbank
router.put('/powerbanks/:id', powerBankController.updatePowerBank);

// Supprimer un powerbank
router.delete('/powerbanks/:id', powerBankController.deletePowerBank);

// Nouvelle route pour les powerbanks fonctionnels
router.get('/powerbanks/functional/all', powerBankController.getFunctionalPowerBanks);

module.exports = router;
