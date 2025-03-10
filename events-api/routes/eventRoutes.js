const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const eventController = require('../controllers/eventController');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Event','Employee'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes events
router.use(dbMiddleware);

router.post('/', eventController.createEvent);
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.put('/:id', eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);

module.exports = router;
