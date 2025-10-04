const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const controller = require('../controllers/weeklyScorecardController');

const router = express.Router();

// Indiquer le modèle dynamique requis
router.use((req, res, next) => {
  req.requiredModels = ['WeeklyScorecards']; // doit correspondre au nom que ton middleware utilise
  next();
});

// Brancher le middleware DB (création du modèle dynamique depuis le schema)
router.use(dbMiddleware);

// CRUD
// 📌 Liste des semaines disponibles
router.get('/AllWeeks', controller.getAvailableWeeks);
router.post('/create', controller.createWeeklyScorecard);
router.get('/all', controller.getAllWeeklyScorecards);
router.get('/:id', controller.getWeeklyScorecardById);
router.put('/update/:id', controller.updateWeeklyScorecard);
router.delete('/delete/:id', controller.deleteWeeklyScorecard);

// Upsert par (employeeId, weekId)
router.put('/upsert', controller.upsertWeeklyScorecard);



// 📌 Toutes les fiches d’une semaine donnée
router.post('/weekId/:weekId', controller.getWeeklyScorecardsByWeek);

// Upsert en bulk (tableau d’items)
router.put('/upsert/bulk', controller.bulkUpsertWeeklyScorecards);


// 👉 Weeks d'un employé (liste + total)
router.get('/driver/:employeeId', controller.getEmployeeWeeks);

// 👉 Détail pour un employé et une semaine donnée
router.get('/by-employee/:employeeId/week/:weekId', controller.getEmployeeWeekDetails);


// 📌 Dernières 6 semaines d’un employé
router.get('/last6weeks/:employeeId', controller.getLast6WeeksByEmployee);




module.exports = router;
