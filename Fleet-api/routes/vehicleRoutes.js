// Fleet-api/routes/vehicleRoutes.js
const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const vehicleController = require('../controllers/vehicleController');

// Multer (mémoire) — déjà configuré dans ../../middlewares/upload
const upload = require('../../middlewares/upload');

const router = express.Router();

/**
 * maybeMulter :
 * - N'active Multer que si la requête est bien en multipart.
 * - Plus tolérant que req.is('multipart/form-data') (certains clients mobiles ajoutent un boundary).
 */
const isMultipart = (req) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  // Ex: "multipart/form-data; boundary=----ExpoFormData..."
  return ct.startsWith('multipart/form-data');
};
const maybeMulter = (req, res, next) => {
  if (isMultipart(req)) {
    return upload.array('files', 10)(req, res, next);
  }
  return next();
};

// ——— Scoping DB: préciser le modèle requis ———
router.use((req, res, next) => {
  req.requiredModels = ['Vehicle'];
  next();
});

// ——— Brancher le middleware DB ———
router.use(dbMiddleware);

// ——— Routes ———
// ADD & UPDATE acceptent JSON (sans fichiers) ou MULTIPART (avec fichiers)
router.post('/add', maybeMulter, vehicleController.addVehicle);
router.put('/:id', maybeMulter, vehicleController.updateVehicleById);

// Lecture / Suppression
router.get('/all', vehicleController.getAllVehicles);
router.get('/:id', vehicleController.getVehicleById);
router.delete('/:id', vehicleController.deleteVehicleById);

module.exports = router;
