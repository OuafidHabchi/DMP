const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const statusController = require('../controllers/statusController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Status'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes statuses
router.use(dbMiddleware);

router.post('/create', statusController.createStatus);          // Create
router.get('/all', statusController.getAllStatuses);            // Read All
router.get('/:id', statusController.getStatusById);             // Read One
router.put('/:id', statusController.updateStatus);              // Update
router.delete('/:id', statusController.deleteStatus);           // Delete

module.exports = router;
