const express = require('express');
const invitationsController = require('../controllers/invitationsController');
const router = express.Router();
const dbMiddleware = require('../../utils/middleware'); // Import du middleware

// Middleware pour spécifier le modèle nécessaire
router.use((req, res, next) => {
    req.requiredModels = ['Invitation']; // Spécifiez que le modèle "Employee" est nécessaire pour ces routes  
    next();
  });
// Appliquer `dbMiddleware` dynamiquement sur les routes employe
router.use(dbMiddleware);

// ✅ Route pour vérifier le statut de l'invitation
router.get('/check/:invitationId', invitationsController.checkInvitationStatus);

// ✅ Route pour rendre l'invitation non fonctionnelle
router.put('/invalidate/:invitationId', invitationsController.invalidateInvitation);

// ✅ sned invitations
router.post('/createEmail', invitationsController.addEmployeFromManager);

// ✅ Route pour récupérer toutes les invitations
router.get('/all', invitationsController.getAllInvitations);

// Route pour supprimer une invitation par son ID
router.delete('/delete/:invitationId', invitationsController.deleteInvitation);


module.exports = router;
