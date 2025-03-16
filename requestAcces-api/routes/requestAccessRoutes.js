// src/routes/requestAccessRoutes.js
const express = require('express');
const requestAccessController = require('../controllers/requestAccessController');
const dbMiddleware = require('../../utils/middleware');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['RequestAccess'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes report issues
router.use(dbMiddleware);

// Route pour créer une demande d'accès
router.post('/request-access', requestAccessController.createRequestAccess);
// Route pour récupérer toutes les demandes d'accès
router.get('/Allrequests', requestAccessController.getAllRequests);

module.exports = router;