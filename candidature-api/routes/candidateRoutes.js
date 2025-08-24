const express = require("express");
const router = express.Router();
const controller = require("../controllers/candidateController");
const dbMiddleware = require('../../utils/middleware'); // Import du middleware

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Candidate','Process']; // Spécifiez que le modèle "Clothes" est nécessaire pour toutes ces routes
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes clothes
router.use(dbMiddleware);

router.post("/create", controller.createCandidate);
router.get("/getAll", controller.getAllCandidates);
router.get("/:id", controller.getCandidateById);
router.patch("/:id/step", controller.moveCandidateToStep);
router.put('/update/:id', controller.updateCandidateFields);

router.delete("/:id", controller.deleteCandidate);

//activer un condiadte 
router.patch("/candidates/:id/activate", controller.activateCandidate);


module.exports = router;
