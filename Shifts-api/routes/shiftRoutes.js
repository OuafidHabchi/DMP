const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const shiftController = require('../controllers/shiftController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Shift'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes shifts
router.use(dbMiddleware);

// Route pour créer un shift
router.post('/shifts', shiftController.createShift);

// Route pour mettre à jour un shift
router.put('/shifts/:id', shiftController.updateShift);

// Route pour supprimer un shift
router.delete('/shifts/:id', shiftController.deleteShift);

// Route pour récupérer tous les shifts
router.get('/shifts', shiftController.getAllShifts);

// Route pour récupérer un shift par son nom
router.get('/shifts/name/:name', shiftController.getShiftByName);

// Route pour récupérer un shift par ID
router.get('/shifts/:id', shiftController.getShiftById);

module.exports = router;
