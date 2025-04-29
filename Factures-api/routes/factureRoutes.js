const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const upload = require("../Middleware/fileUploadMiddleware");
const factureController = require('../controllers/factureController');
const router = express.Router();


// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
    req.requiredModels = ['Factures', 'Employee'];
    next();
});

// 



router.post('/create', upload.single('file'), dbMiddleware, factureController.createFacture);
router.get('/getAll',dbMiddleware, factureController.getFactures);
router.get('/:id',dbMiddleware, factureController.getFactureById);
router.put('/:id',dbMiddleware, upload.single('file'), factureController.updateFacture);
router.delete('/:id',dbMiddleware, factureController.deleteFacture);

module.exports = router;