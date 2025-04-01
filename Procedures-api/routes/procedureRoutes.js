const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const procedureController = require('../controllers/procedureController');
const router = express.Router();

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
  req.requiredModels = ['Procedure','Employee'];
  next();
});

// Appliquer `dbMiddleware` dynamiquement sur les routes procedures
router.use(dbMiddleware);

// Routes CRUD
router.get('/', procedureController.getAllProcedures); // GET toutes les procédures
router.post('/create', procedureController.createProcedure); // POST créer une procédure
router.put('/:id', procedureController.updateProcedure); // PUT mettre à jour une procédure
router.delete('/:id', procedureController.deleteProcedure); // DELETE supprimer une procédure
router.put('/:id/seen', procedureController.addToSeen); // PUT ajouter un utilisateur à la liste 'seen'
router.get('/:id', procedureController.getProcedureById);


module.exports = router;
