// Storage-api/routes/storageRoutes.js
const express = require('express');
const upload = require('../../middlewares/upload'); // ton multer memoryStorage
const ctrl = require('../controllers/storageController');

const router = express.Router();

// Upload multi-fichiers (images, pdf, vidéos si tu ouvres le fileFilter)
router.post('/upload', upload.array('files', 20), ctrl.uploadAny);

// Suppression par URLs publiques
router.post('/delete-urls', ctrl.deleteByUrls);

// Suppression par keys
router.post('/delete-keys', ctrl.deleteByKeys);

module.exports = router;
