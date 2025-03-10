const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const reportIssuesController = require('../controllers/reportIssuesController');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['ReportIssues'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes report issues
router.use(dbMiddleware);

// CRUD routes
router.post('/create', reportIssuesController.createReportIssue);
router.get('/all', reportIssuesController.getAllReportIssues);
router.get('/reportIssues/:id', reportIssuesController.getReportIssueById);
router.put('/update/:id', reportIssuesController.updateReportIssue);
router.delete('/delete/:id', reportIssuesController.deleteReportIssue);
router.delete('/van/:vanId', reportIssuesController.deleteReportIssuesByVanId);

module.exports = router;
