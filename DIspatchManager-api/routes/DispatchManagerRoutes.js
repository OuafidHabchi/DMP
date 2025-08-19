const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const FleetController = require('../controllers/Fleet/FleetController');
const HRController = require('../controllers/HR/HRController');

const router = express.Router();

// Middleware pour spécifier tous les modèles requis par les deux modules
router.use((req, res, next) => {
  req.requiredModels = [
    'Vehicle',
    'ReportIssues',
    'Employee',
    'Status',
    'VanAssignment',
    'Disponibilite',
    'Shift',
    'EquipmentUpdate',
    'TimeCard',
    "Phone",
    "PowerBank",
  ];
  next();
});

// Middleware de connexion à la base
router.use(dbMiddleware);
// Route du module HR
router.get('/getemployees', HRController.getEmployeesDisponibilitesByDateRange);
// Route pour récupérer les presences des employés par date
router.get('/EmployeesPresenceByDate', HRController.getEmployeesPresenceByDate);

// Route GET avec paramètre date dans query pour recuper les employes disponibles mais sont pas sur la route  
router.get('/disposnNotWorking', HRController.getDisposNotWorkedByDate);

// Route GET avec paramètre date dans query pour recuper les employes qui ont depasser la durre de cortex 
router.get('/lateDrivers', HRController.getOverworkedEmployeesByDate);

router.get('/getvanassignments', FleetController.getVanAssignmentsByDate);

// Route pour récupérer les employés n'ayant pas envoyé les photos pré/post
router.get('/getmissingphotos', FleetController.getMissingEquipmentPhotosByDate);
// Route du module Fleet
router.get('/getavailablevans', FleetController.getVanAvailabilityStats);
router.get('/getphonestats', FleetController.getPhoneStats);
router.get('/getPowerBankstats', FleetController.getPowerBankStats);
router.get('/getEmployeeEquipmentsByDate', FleetController.getEmployeeEquipmentsByDate);




module.exports = router;
