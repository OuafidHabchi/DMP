// routes/equipmentUpdateRoutes.js
const express = require('express');
const dbMiddlewareEquipmentUpdate = require('../midleware/dbMiddlewareEquipmentUpdate');
const equipmentUpdateController = require('../controllers/EquipmentUpdateController');
const upload = require('../../middlewares/upload'); // ✅ ton multer mémoire

const router = express.Router();

// ✅ Active Multer seulement si la requête est multipart
const maybeMulter = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return upload.single('image')(req, res, next); // champ file = "image"
  }
  return next();
};

// DB dyn
router.use(dbMiddlewareEquipmentUpdate);

// ➜ Créer une mise à jour (multipart requis côté client si image jointe)
router.post('/equipment-updates', maybeMulter, equipmentUpdateController.createEquipmentUpdate);

// ➜ Récupérer par date (JSON simple)
router.get('/equipment-updates-by-date', equipmentUpdateController.getEquipmentUpdatesByDate);

module.exports = router;
