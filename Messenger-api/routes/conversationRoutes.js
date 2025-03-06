const express = require('express');
const conversationController = require('../controllers/conversationController');
const dbMiddleware = require('../MidleWareMessenger/middlewareMessenger');

const router = express.Router();

// Route pour créer une conversation
router.post(
  '/conversations',
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  conversationController.createConversation
);

// Route pour récupérer les conversations d'un employé
router.get(
  '/conversations/:employeeId',
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  conversationController.getConversationsByEmployee
);

// Route pour supprimer une conversation et ses messages associés
router.delete(
  '/conversations/:conversationId',
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  conversationController.deleteConversation
);

// Route pour vérifier si un utilisateur a des messages non lus
router.get(
  '/conversations/unreadStatus/:userId',
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  conversationController.hasUnreadMessages
);

// Route pour ajouter des participants à une conversation
router.patch(
  '/conversations/:conversationId/participants',
  async (req, res, next) => {
    try {
      await dbMiddleware(req, res, next);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la connexion à la base de données.' });
    }
  },
  conversationController.addParticipants
);

module.exports = router;