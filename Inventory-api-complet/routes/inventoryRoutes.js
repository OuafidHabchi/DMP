const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const inventoryController = require('../controllers/inventoryController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['InventoryItem'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes inventory
router.use(dbMiddleware);

// Routes
router.get('/', inventoryController.getAllItems); // GET all items
router.get('/:id', inventoryController.getItemById); // GET an item by ID
router.post('/create', inventoryController.createItems); // CREATE multiple items
router.put('/update', inventoryController.updateItems); // UPDATE multiple items
router.delete('/', inventoryController.clearAllItems); // DELETE all items

module.exports = router;
