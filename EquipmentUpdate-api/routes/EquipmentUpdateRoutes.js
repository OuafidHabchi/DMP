const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dbMiddlewareEquipmentUpdate = require('../midleware/dbMiddlewareEquipmentUpdate'); // Import du middleware
const equipmentUpdateController = require('../controllers/EquipmentUpdateController');

const router = express.Router();

// Vérifier et créer le dossier d'upload s'il n'existe pas
const uploadDir = path.join(__dirname, '../uploadsequipment');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration de multer pour l'upload des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Dossier d'upload
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Route pour envoyer un Equipment Update
router.post(
  '/equipment-updates',
  upload.single('image'), // Utilisation de la clé 'image'
  (req, res, next) => {
    // Vérification des données dans le body
    if (!req.body.employeeName || !req.body.vanName || !req.body.localTime) {
      return res
        .status(500)
        .json({
          message:
            "Les informations de l'employé, du van et du temps sont requises. routes",
        });
    }

    // Vérification si le fichier a bien été reçu
    if (!req.file) {
      return res.status(500).json({ message: "L'image est requise." });
    }

    next(); // Passer au middleware suivant ou au contrôleur
  },
  dbMiddlewareEquipmentUpdate, // Middleware pour initialiser la connexion et les modèles
  equipmentUpdateController.createEquipmentUpdate // Controller qui gère l'ajout
);

// Route pour récupérer les données par date
router.get(
  '/equipment-updates-by-date',
  dbMiddlewareEquipmentUpdate, // Middleware pour initialiser la connexion et les modèles
  equipmentUpdateController.getEquipmentUpdatesByDate // Contrôleur pour gérer la requête
);

module.exports = router;
