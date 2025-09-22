const express = require("express");
const multer = require("multer");
const worningController = require("../controllers/worningController");
const dbMiddlewareWorning = require('../midleware/dbMiddlewareWorning');
const path = require('path');
const fs = require('fs');


const router = express.Router();

// Configuration de multer
const uploadDirectory = path.join(__dirname, '../uploads-wornings');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const upload = multer({ storage: multer.memoryStorage() });


// Middleware pour loguer les requêtes
router.use((req, res, next) => {
  next();
});

// Routes pour les warnings
router.get("/wornings", dbMiddlewareWorning, worningController.getAllWornings);

router.get("/wornings/:id", dbMiddlewareWorning, worningController.getWorningById);

router.post(
  "/wornings",
  upload.single("photo"), // Laisse l'upload mais ne bloque pas l'absence de fichier
  dbMiddlewareWorning,
  worningController.createWorning
);

router.put(
  "/wornings/:id",
  upload.single("photo"),
  (req, res, next) => {
    if (!req.file) {
    }
    next();
  },
  dbMiddlewareWorning,
  worningController.updateWorning
);

router.delete("/wornings/:id", dbMiddlewareWorning, worningController.deleteWorning);

router.get(
  "/wornings/employe/:employeID",
  dbMiddlewareWorning,
  worningController.getWorningsByEmployeID
);

router.post(
  "/wornings/bulk",
  dbMiddlewareWorning,
  worningController.createMultipleWarnings
);

router.post(
  "/wornings/suspensions/check",
  dbMiddlewareWorning,
  worningController.checkSuspensionsForEmployees
);

router.get(
  "/wornings/templates/get",
  dbMiddlewareWorning,
  worningController.getTemplateWarnings
);



// Multer en mémoire pour cette route (nécessaire pour uploader vers Spaces depuis buffer)
const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image files are allowed!'));
  },
});

// Nouvelle route dédiée au composant (URL ou fichier)
router.post(
  '/component',
  uploadMem.single('photo'),      // accepte File sous "photo" (sinon URL dans body.photo)
  dbMiddlewareWorning,
  worningController.createWorningFromComponent
);


module.exports = router;
