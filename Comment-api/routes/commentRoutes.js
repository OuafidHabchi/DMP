const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const commentController = require('../controllers/commentController');
const logger = require('../../utils/logger');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Comment'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes commentaires
router.use(dbMiddleware);

// Routes pour les commentaires
router.post('/create', commentController.createComment); // Créer un commentaire
router.get('/', commentController.getAllComments); // Récupérer tous les commentaires
router.get('/:idEmploye', commentController.getCommentsByEmployeId); // Récupérer les commentaires par ID employé
router.put('/:id', commentController.updateComment); // Mettre à jour un commentaire par ID
router.delete('/:id', commentController.deleteComment); // Supprimer un commentaire par ID
router.get('/date/:date', commentController.getCommentsByDate); // Récupérer les commentaires par date

module.exports = router;
