const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const vanAssignmentController = require('../controllers/vanAssignmentController');

const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = [
    'VanAssignment',
    'Vehicle',
    'ReportIssues',
    'Status',
    'Shift',
    'Employee',
    'Disponibilite',
  ];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes van assignments
router.use(dbMiddleware);

// Route pour créer une nouvelle affectation de véhicule
router.post('/create', vanAssignmentController.createVanAssignment);

// Route pour récupérer toutes les affectations de véhicules
router.get('/all', vanAssignmentController.getAllVanAssignments);

// Route pour récupérer une affectation de véhicule par ID
router.get('/:id', vanAssignmentController.getVanAssignmentById);

// Route pour mettre à jour une affectation de véhicule
router.put('/:id', vanAssignmentController.updateVanAssignment);

// Route pour supprimer une affectation de véhicule
router.delete('/delete/:employeeId/:date', vanAssignmentController.deleteVanAssignment);

// Route pour obtenir les assignations pour une date donnée
router.get('/date/:date', vanAssignmentController.getAssignmentsByDate);

router.post('/process-assignments', vanAssignmentController.processVanAssignments);




module.exports = router;
