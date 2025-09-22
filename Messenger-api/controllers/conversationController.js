const storage = require('../../utils/storage/index'); // ton adapter Spaces
const { sendPushNotification } = require('../../utils/notifications');
const path = require('path');
const { deleteByUrls } = require('../../utils/storage/uploader'); // ajoute cet import en haut


// Créer une nouvelle conversation
exports.createConversation = async (req, res) => {
  try {
    if (!req.connection || !req.connection.models.Conversation) {
      throw new Error("La connexion ou le modèle Conversation est introuvable.");
    }

    const Conversation = req.connection.models.Conversation;
    const { participants, isGroup, name } = req.body;

    const conversation = new Conversation({
      participants,
      isGroup,
      name,
    });

    await conversation.save();
    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la création de la conversation." });
  }
};

// Récupérer les conversations d'un employé
exports.getConversationsByEmployee = async (req, res) => {
  try {
    const Conversation = req.connection.models.Conversation;
    const { employeeId } = req.params;

    const conversations = await Conversation.find({ participants: employeeId });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
  }
};

// Supprimer une conversation et tous les messages associés
exports.deleteConversation = async (req, res) => {
  try {
    const Conversation = req.connection.models.Conversation;
    const Message = req.connection.models.Message;
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée.' });
    }

    // 1) Récupérer tous les messages liés
    const messages = await Message.find({ conversationId });

    // 2) Extraire les URLs de fichiers
    const urls = messages
      .map((m) => m.fileUrl)
      .filter((u) => !!u);

    // 3) Supprimer les fichiers dans Spaces
    if (urls.length > 0) {
      try {
        await deleteByUrls(urls);
      } catch (err) {
        console.warn('[deleteConversation] Erreur suppression fichiers Spaces:', err?.message || err);
      }
    }

    // 4) Supprimer la conversation et ses messages
    await Conversation.findByIdAndDelete(conversationId);
    await Message.deleteMany({ conversationId });

    res.status(200).json({ message: 'Conversation, messages et fichiers associés supprimés.' });
  } catch (error) {
    console.error('deleteConversation error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la conversation.' });
  }
};

// Vérifier si un utilisateur a des messages non lus
exports.hasUnreadMessages = async (req, res) => {
  try {
    const Conversation = req.connection.models.Conversation;
    const Message = req.connection.models.Message;
    const { userId } = req.params;

    const conversations = await Conversation.find({ participants: userId });
    const unreadStatus = {};

    for (const conversation of conversations) {
      const hasUnreadMessages = await Message.exists({
        conversationId: conversation._id,
        readBy: { $ne: userId },
      });
      unreadStatus[conversation._id] = hasUnreadMessages;
    }

    res.status(200).json(unreadStatus);
  } catch (error) {
    console.error('Error checking unread messages:', error);
    res.status(500).json({ error: 'Error checking unread messages' });
  }
};

// Ajouter des participants
exports.addParticipants = async (req, res) => {
  try {
    const Conversation = req.connection.models.Conversation;
    const { conversationId } = req.params;
    const { newParticipants } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(500).json({ error: 'Conversation not found.' });
    }

    const updatedParticipants = [...new Set([...conversation.participants, ...newParticipants])];
    conversation.participants = updatedParticipants;
    await conversation.save();

    const io = req.app.get('socketio');
    io.to(conversationId).emit('participantsUpdated', {
      conversationId,
      updatedParticipants,
    });

    res.status(200).json({ message: 'Participants added successfully.', conversation });
  } catch (error) {
    res.status(500).json({ error: 'Error adding participants.' });
  }
};
