const express = require("express");
const router = express.Router();
const controller = require("../controllers/processController");
const dbMiddleware = require('../../utils/middleware'); // Import du middleware

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Candidate','Process']; // Spécifiez que le modèle "Clothes" est nécessaire pour toutes ces routes
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes clothes
router.use(dbMiddleware);

router.get("/getProcess", controller.getProcess);
router.post("/create", controller.createProcess);
router.put("/update", controller.updateProcess);
router.delete("/delete", controller.deleteProcess);


module.exports = router;
