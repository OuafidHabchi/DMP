const express = require('express');
const multer = require('multer');
const path = require('path');
const dbMiddleware = require('../../utils/middleware');
const dailyNoteController = require('../controllers/dailyNoteController');

const router = express.Router();

// Configuration de multer pour sauvegarder les fichiers localement
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploadsdailynote'); // Chemin vers le dossier des uploads
        cb(null, uploadPath); // Enregistrer les fichiers dans `uploadsdailynote`
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`); // Générer un nom unique pour chaque fichier
    },
});

const upload = multer({ storage });

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
    req.requiredModels = ['DailyNote'];
    next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes daily notes
router.use(dbMiddleware);

// Routes pour les daily notes
router.post('/create', upload.single('photo'), dailyNoteController.createDailyNote);
router.get('/all', dailyNoteController.getAllDailyNotes);
router.get('/by-date', dailyNoteController.getDailyNotesByDate);
router.patch('/mark-as-read', dailyNoteController.markAsRead);
router.get('/details/:noteId', dailyNoteController.getNoteDetails);

module.exports = router;
