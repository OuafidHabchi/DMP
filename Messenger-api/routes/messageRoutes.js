const express = require('express');
const multer = require('multer');
const messageController = require('../controllers/messageController');
const dbMiddleware = require('../MidleWareMessenger/middlewareMessenger');

const router = express.Router();

// Limites
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/quicktime',
  'application/pdf',
  'audio/mpeg',
  'audio/mp3',
];
const ALLOWED_EXTENSIONS = [
  '.jpeg',
  '.jpg',
  '.png',
  '.mp4',
  '.mov',
  '.pdf',
  '.mp3',
];

// Multer -> stockage en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non pris en charge : "${ext}"`));
    }
  },
});

// Middleware d’upload
const handleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(500).json({ error: `Erreur fichier: ${err.message}` });
    }
    next();
  });
};

// Route pour envoyer un message avec fichier
router.post(
  '/messages/upload',
  handleFileUpload,
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  (req, res, next) => {
    req.io = req.app.get('socketio');
    next();
  },
  messageController.uploadMessage
);

// Route pour récupérer les messages d'une conversation
router.get(
  '/messages/:conversationId',
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  messageController.getMessagesByConversation
);

// Route pour marquer les messages comme lus
router.post(
  '/messages/markAsRead',
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res
        .status(500)
        .json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  messageController.markMessagesAsRead
);

module.exports = router;
