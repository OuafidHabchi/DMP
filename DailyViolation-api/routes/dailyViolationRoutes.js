const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const upload = require('../../middlewares/upload'); // multer (memoryStorage)
const dailyViolationController = require('../controllers/dailyViolationController');
const violationTemplateController = require('../controllers/violationTemplateController');

const router = express.Router();

/** Précharger les modèles nécessaires pour ces routes */
router.use((req, res, next) => {
  req.requiredModels = ['DailyViolation', 'DailyViolationTemplate', 'Employee'];
  next();
});

/** Connexion DB par requête */
router.use(dbMiddleware);

/** Multer appliqué seulement si multipart/form-data */
const maybeMulter = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return upload.any()(req, res, next); // accepte 'file' ou 'files'
  }
  return next();
};

// ----------------------
// 🔖 ROUTES TEMPLATES 🔖
// ----------------------
router.post('/templates/create', violationTemplateController.createTemplate);
router.get('/templates', violationTemplateController.getTemplates);
router.put('/templates/:id', violationTemplateController.updateTemplate);
router.delete('/templates/:id', violationTemplateController.deleteTemplate);

// ----------------------
// 🚦 ROUTES VIOLATIONS 🚦
// ----------------------

// créer (supporte fichier multipart OU image en DataURL dans body)
router.post('/create', maybeMulter, dailyViolationController.createViolation);

// liste complète
router.get('/', dailyViolationController.getViolations);

// routes spécifiques /violations/* (placées avant les routes paramétriques)
router.get('/violations/by-day', dailyViolationController.getViolationsByDay);
router.get('/violations/weekly', dailyViolationController.getWeeklyViolations);
router.get('/violations/employee-weekly', dailyViolationController.getEmployeeWeeklyViolations);
router.get('/violations/employee-details', dailyViolationController.getEmployeeViolationsByDate);
router.get('/violations/all-employees-weekly', dailyViolationController.getAllEmployeesWeeklyViolations);

// CRUD par id (après /violations/*)
router.get('/:id', dailyViolationController.getViolationById);
router.put('/:id', maybeMulter, dailyViolationController.updateViolation); // prêt pour update photo si besoin
router.delete('/:id', dailyViolationController.deleteViolation);

module.exports = router;
