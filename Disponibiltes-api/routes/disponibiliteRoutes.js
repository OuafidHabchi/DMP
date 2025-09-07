const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const disponibiliteController = require('../controllers/disponibiliteController');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Disponibilite','Shift'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes disponibilites
router.use(dbMiddleware);

// Créer une disponibilité
router.post('/disponibilites/create', disponibiliteController.createDisponibilite);

// Récupérer toutes les disponibilités
router.get('/disponibilites', disponibiliteController.getAllDisponibilites);

//get dipos par range de date
router.get('/disponibilites/RangeDate', disponibiliteController.getDisponibilitesInDateRange);

//get dispo par employe et range de date
router.post('/disponibilites/dateRange/:employeeId', disponibiliteController.getDisponibilitesByEmployeeAndDateRange);


// Récupérer une disponibilité par son ID
router.get('/disponibilites/:id', disponibiliteController.getDisponibiliteById);
router.get('/forWarnings/disponibilites', disponibiliteController.getDisponibilitesByIdsForWarning);

// Mettre à jour une disponibilité( confirmation a true or false)
router.put('/confirmDisponibilite/:id', disponibiliteController.confirmDisponibilite);

// Supprimer une disponibilité
router.delete('/disponibilites/:id', disponibiliteController.deleteDisponibilite);

// Supprimer des disponibilités par Shift ID
router.delete('/disponibilites/shift/:shiftId', disponibiliteController.deleteDisponibilitesByShiftId);

// Mise à jour en masse des disponibilités
router.post('/updateDisponibilites', disponibiliteController.updateMultipleDisponibilites);

// Confirmer la mise à jour en masse des disponibilités
router.post('/updateDisponibilites/confirmation', disponibiliteController.updateMultipleDisponibilitesConfirmation);

// Récupérer les disponibilités par Employee ID
router.get('/disponibilites/employee/:employeeId', disponibiliteController.getDisponibilitesByEmployeeId);

// Récupérer les disponibilités par Employee ID et jour
router.get('/disponibilites/employee/:employeeId/day/:selectedDay', disponibiliteController.getDisponibilitesByEmployeeAndDay);

// Mettre à jour la présence d'une disponibilité par ID
router.put('/disponibilites/:id/presence', disponibiliteController.updateDisponibilitePresenceById);

router.get('/byDate', disponibiliteController.getDisponibilitesByDate);

// Route pour récupérer les disponibilités confirmées d'une journée donnée
router.get('/presence/confirmed-by-day', disponibiliteController.getConfirmedDisponibilitesByDay);

// Récupérer les disponibilités d'un employé après une date donnée
router.get('/disponibilites/employee/:employeeId/after/:selectedDate', disponibiliteController.getDisponibilitesAfterDate);

// Mettre à jour la suspension pour une liste d'IDs de disponibilités
router.post('/disponibilites/suspension', disponibiliteController.updateDisponibilitesSuspension);

// Mettre à jour le statut `seen` d'une disponibilité
router.put('/disponibilites/:id/seen', disponibiliteController.updateDisponibiliteSeen);

router.post('/disponibilites/Update/suspension', disponibiliteController.suspendDisponibilites);
router.post('/disponibilites/Update/unsuspend', disponibiliteController.unsuspendDisponibilites);




module.exports = router;
