const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const assignmentController = require('../controllers/clothesAssignmentController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['ClothesAssignment'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes assignments
router.use(dbMiddleware);

// Routes CRUD
router.get('/assignments', assignmentController.getAllAssignments);
router.get('/assignments/:id', assignmentController.getAssignmentById);
router.post('/assignments', assignmentController.createAssignment);
router.delete('/assignments/:id', assignmentController.deleteAssignment);

module.exports = router;
