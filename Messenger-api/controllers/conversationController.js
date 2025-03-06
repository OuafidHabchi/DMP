// /controllers/conversationController.js

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
    const Conversation = req.connection.models.Conversation; // Modèle dynamique
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
    const Conversation = req.connection.models.Conversation; // Modèle dynamique
    const Message = req.connection.models.Message; // Modèle dynamique
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(500).json({ error: 'Conversation non trouvée.' });
    }

    // Supprimer la conversation
    await Conversation.findByIdAndDelete(conversationId);

    // Supprimer tous les messages associés à cette conversation
    await Message.deleteMany({ conversationId });

    res.status(200).json({ message: 'Conversation et messages associés supprimés.' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression de la conversation.' });
  }
};



// conversationController.js
exports.hasUnreadMessages = async (req, res) => {
  try {
    const Conversation = req.connection.models.Conversation; // Modèle dynamique
    const Message = req.connection.models.Message; // Modèle dynamique
    const { userId } = req.params;
    // Find all conversations involving the user
    const conversations = await Conversation.find({ participants: userId });
    const unreadStatus = {};

    for (const conversation of conversations) {
      // Check if there are messages that haven't been read by the current user
      const hasUnreadMessages = await Message.exists({
        conversationId: conversation._id,
        readBy: { $ne: userId }, // Messages where userId is not in `readBy`
      });

      // Store the unread status for each conversation
      unreadStatus[conversation._id] = hasUnreadMessages;
    }

    // Return the unread status object to the client
    res.status(200).json(unreadStatus);
  } catch (error) {
    console.error('Error checking unread messages:', error);
    res.status(500).json({ error: 'Error checking unread messages' });
  }
};


exports.addParticipants = async (req, res) => {
  try {
    const Conversation = req.connection.models.Conversation; // Modèle dynamique
    const { conversationId } = req.params;
    const { newParticipants } = req.body;

    // Check if the conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(500).json({ error: 'Conversation not found.' });
    }

    // Merge new participants with existing participants, removing duplicates
    const updatedParticipants = [...new Set([...conversation.participants, ...newParticipants])];

    // Update the conversation with the new participants
    conversation.participants = updatedParticipants;
    await conversation.save();

    // Emit a Socket.IO event to update the participants in real time
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


