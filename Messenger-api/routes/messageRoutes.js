const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const messageController = require('../controllers/messageController');
const dbMiddleware = require('../MidleWareMessenger/middlewareMessenger');

const router = express.Router();

const UPLOAD_DIR = path.resolve(__dirname, '../uploads'); // Correct path for the uploads directory
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 150 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.mp4', '.mov', '.pdf'];

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `file-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non pris en charge : "${fileExtension}"`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

const handleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(500).json({ error: `Erreur Multer: ${err.message}` });
    } else if (err) {
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
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
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
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
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
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  messageController.markMessagesAsRead
);

module.exports = router;
