// routes/clothesRoutes.js
const express = require('express');
const dbMiddleware = require('../../utils/middleware'); // Import du middleware
const clothesController = require('../controllers/clothesController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Clothes']; // Spécifiez que le modèle "Clothes" est nécessaire pour toutes ces routes
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes clothes
router.use(dbMiddleware);

// Routes CRUD
router.get('/clothes', clothesController.getAllClothes);
router.get('/clothes/:id', clothesController.getClothesById);
router.post('/clothes', clothesController.createClothes);
router.put('/clothes/:id', clothesController.updateClothes);
router.delete('/clothes/:id', clothesController.deleteClothes);

module.exports = router;
