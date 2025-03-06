const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const timeCardController = require('../controllers/timeCardController');
const logger = require('../../utils/logger');
const upload = require("../Middleware/fileUploadMiddleware");
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['TimeCard'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes timecards
router.use(dbMiddleware);

router.post('/timecards', timeCardController.createTimeCard);
router.get('/timecards', timeCardController.getTimeCards);
router.get('/timecards/:id', timeCardController.getTimeCardById);
router.put('/timecards/:id', timeCardController.updateTimeCard);
router.delete('/timecards/:id', timeCardController.deleteTimeCard);

// Route pour obtenir la fiche de temps par employeeId et day
router.get('/timecards/:employeeId/:day', timeCardController.getTimeCardByEmployeeAndDay);

// Route pour mettre à jour la fiche de temps par employeeId et day
router.put('/timecards/:employeeId/:day', timeCardController.updateOrCreateTimeCard);

// Route to get all time cards for a specific day
router.get('/timecardsss/dday/:day', timeCardController.getTimeCardsByDay);

// Route pour la mise à jour ou création en masse des attributs Cortex
router.post('/timecards/bulk-update-cortex', timeCardController.bulkUpdateOrCreateCortexAttributes);

router.post(
  "/timecards/:id/upload-image",
  upload.single("photo"), // Accept a single file with the field name 'photo'
  timeCardController.uploadTimeCardImage
);

module.exports = router;
