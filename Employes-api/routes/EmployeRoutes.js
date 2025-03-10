const express = require('express');
const employeController = require('../controllers/employeController');
const router = express.Router();
const dbMiddleware = require('../../utils/middleware'); // Import du middleware



// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Employee','Invitation']; // Spécifiez que le modèle "Employee" est nécessaire pour ces routes

  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes employe
router.use(dbMiddleware);

// Routes pour gérer les employés
router.post('/register', employeController.registeremploye);
router.post('/login', employeController.loginemploye);
router.get('/profile/:id', employeController.getemployeProfile);
router.put('/profile/:id', employeController.updateemployeProfile);
router.put('/scoreCard', employeController.updateScoreCardByTransporterIDs);
router.get('/', employeController.getAllEmployees);
router.delete('/profile/:id', employeController.deleteEmploye);
router.post('/by-ids', employeController.getEmployeesByIds);
module.exports = router;
