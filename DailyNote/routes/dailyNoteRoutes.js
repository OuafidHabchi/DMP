// DailyNote/routes/dailyNoteRoutes.js
const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const dailyNoteController = require('../controllers/dailyNoteController');

// ✅ on réutilise le middleware multer mémoire commun
const upload = require('../../middlewares/upload');

const router = express.Router();

// 👉 n'applique Multer que pour les requêtes multipart/form-data
const maybeMulterSinglePhoto = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    // un seul champ fichier: "photo"
    return upload.single('photo')(req, res, next);
  }
  return next();
};

// modèle requis
router.use((req, res, next) => {
  req.requiredModels = ['DailyNote'];
  next();
});

// connexion DB dynamique
router.use(dbMiddleware);

// Routes
router.post('/create', maybeMulterSinglePhoto, dailyNoteController.createDailyNote);
router.get('/all', dailyNoteController.getAllDailyNotes);
router.get('/by-date', dailyNoteController.getDailyNotesByDate);
router.patch('/mark-as-read', dailyNoteController.markAsRead);
router.get('/details/:noteId', dailyNoteController.getNoteDetails);

module.exports = router;
