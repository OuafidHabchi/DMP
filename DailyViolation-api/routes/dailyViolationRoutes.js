const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const dailyViolationController = require('../controllers/dailyViolationController');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['DailyViolation'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes daily violations
router.use(dbMiddleware);

// Créer une violation
router.post('/create', dailyViolationController.createViolation);

// Obtenir toutes les violations
router.get('/', dailyViolationController.getViolations);

// Obtenir une violation par ID
router.get('/:id', dailyViolationController.getViolationById);

// Mettre à jour une violation
router.put('/:id', dailyViolationController.updateViolation);

// Supprimer une violation
router.delete('/:id', dailyViolationController.deleteViolation);

// Obtenir les violations par jour
router.get('/violations/by-day', dailyViolationController.getViolationsByDay);

// Obtenir les violations hebdomadaires
router.get('/violations/weekly', dailyViolationController.getWeeklyViolations);

// Obtenir les violations hebdomadaires pour un employé
router.get('/violations/employee-weekly', dailyViolationController.getEmployeeWeeklyViolations);

// Obtenir les détails des violations pour un employé à une date donnée
router.get('/violations/employee-details', dailyViolationController.getEmployeeViolationsByDate);

// Endpoint: /api/dailyViolations/violations/all-employees-weekly
router.get('/violations/all-employees-weekly', dailyViolationController.getAllEmployeesWeeklyViolations);


module.exports = router;
