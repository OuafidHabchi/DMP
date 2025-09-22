// routes/trainingRoutes.js
const express = require('express');
const dbMiddleware = require('../../utils/middleware'); // adapte le chemin si besoin
const trainingController = require('../controllers/trainingController');
const upload = require('../../middlewares/upload');     // Multer mémoire

const router = express.Router();

// Active Multer uniquement si multipart
const isMultipart = (req) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  return ct.startsWith('multipart/form-data');
};
const maybeMulter = (req, res, next) => {
  if (isMultipart(req)) return upload.array('files', 20)(req, res, next); // champ "files"
  return next();
};

// Charger le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Employee', 'Training'];
  next();
});
router.use(dbMiddleware);

// CRUD Training
router.post('/add', maybeMulter, (req, res, next) => {
  
  next(); // passe au controller
}, trainingController.addTraining);
router.get('/all', trainingController.getAllTrainings);
router.get('/:id', trainingController.getTrainingById);
router.put('/:id', maybeMulter, trainingController.updateTrainingById);
router.delete('/:id', trainingController.deleteTrainingById);

// Jours (embarqués)
router.post('/:id/day', trainingController.addDay);
router.put('/:id/day/:dayId', trainingController.updateDayById);
router.put('/:id/day/:dayId/result', trainingController.setDayResult);
router.delete('/:id/day/:dayId', trainingController.deleteDayById);

// Documents (type/title/url)
router.post('/:id/document', maybeMulter, trainingController.addDocuments);
router.delete('/:id/document/:docId', trainingController.deleteDocument);

module.exports = router;
