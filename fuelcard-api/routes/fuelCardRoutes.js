const express = require('express');
const router = express.Router();
const dbMiddleware = require('../../utils/middleware');
const fuelCardController = require('../controllers/fuelCardController');

// Middleware pour injecter dynamiquement le modèle
router.use((req, res, next) => {
  req.requiredModels = ['FuelCard'];
  next();
});

router.use(dbMiddleware);

// Routes FuelCard
router.post('/create', fuelCardController.createFuelCard);
router.get('/getAll', fuelCardController.getAllFuelCards);
router.get('/:id', fuelCardController.getFuelCardById);
router.put('/:id', fuelCardController.updateFuelCard);
router.delete('/:id', fuelCardController.deleteFuelCard);

module.exports = router;
