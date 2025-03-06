const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const logger = require('../../utils/logger');
const dbMiddleware = require('../../utils/middleware'); // Import du middleware



// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Contact']; // Spécifiez que le modèle "Employee" est nécessaire pour ces routes

  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes employe
router.use(dbMiddleware);

router.post('/create', contactController.addContact);
router.get('/all', contactController.getAllContacts);
router.get('/:id', contactController.getContactById);
router.put('/:id', contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

module.exports = router;
