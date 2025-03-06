const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const phoneController = require('../controllers/phoneController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Phone'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes phones
router.use(dbMiddleware);

// Créer un nouveau phone
router.post('/phones/create', phoneController.createPhone);

// Obtenir tous les phones
router.get('/phones', phoneController.getAllPhones);

// Obtenir un phone par ID
router.get('/phones/:id', phoneController.getPhoneById);

// Mettre à jour un phone
router.put('/phones/:id', phoneController.updatePhone);

// Supprimer un phone
router.delete('/phones/:id', phoneController.deletePhone);

// Nouvelle route pour les téléphones fonctionnels
router.get('/phones/functional/all', phoneController.getFunctionalPhones);

module.exports = router;
