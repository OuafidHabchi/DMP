const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csvController');
const upload = require('../middlewares/uploadMiddleware'); // Middleware de gestion d'upload

// Route pour uploader un fichier CSV
router.post('/upload', upload.single('file'), csvController.uploadCSV);

module.exports = router;
