// Factures-api/routes/factureRoutes.js
const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const upload = require('../../middlewares/upload'); // ← ton multer memoryStorage réutilisable
const factureController = require('../controllers/factureController');

const router = express.Router();

// On prépare les modèles utilisés
router.use((req, res, next) => {
  req.requiredModels = ['Factures', 'Employee'];
  next();
});

// DB
router.use(dbMiddleware);

// ✅ Multer seulement si multipart
const maybeMulter = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    // accepte 'file' OU 'files'
    return upload.any()(req, res, next);
  }
  return next();
};

router.post('/create', maybeMulter, factureController.createFacture);
router.get('/getAll', factureController.getFactures);
router.get('/:id', factureController.getFactureById);
router.put('/:id', maybeMulter, factureController.updateFacture);
router.delete('/:id', factureController.deleteFacture);

module.exports = router;
