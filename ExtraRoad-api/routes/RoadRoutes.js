const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const RoadController = require('../controllers/RoadController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['ExtraRoad'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes roads
router.use(dbMiddleware);

// CRUD routes
router.get('/', RoadController.getAllRoads);
router.get('/:id', RoadController.getRoadById);
router.post('/create', RoadController.createRoad);
router.put('/:id', RoadController.updateRoad);
router.delete('/:id', RoadController.deleteRoad);

// Récupérer les routes par date
router.get('/bydate/get', RoadController.getRoadsByDate);

module.exports = router;
