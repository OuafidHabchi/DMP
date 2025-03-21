const { sendPushNotification } = require('../../utils/notifications');
const path = require('path');

// Fonction utilitaire pour valider les connexions et modèles
const validateConnection = (connection, modelName) => {
  if (!connection || !connection.models[modelName]) {
    throw new Error(`La connexion ou le modèle ${modelName} est introuvable.`);
  }
};

// Déterminer le contenu du message
const determineMessageContent = (file, content) => {
  if (file) {
    if (file.mimetype.startsWith('video/')) return '';
    if (file.mimetype.startsWith('image/')) return '';
    return '';
  }
  return content || 'Média partagé';
};

// Envoi d'un message avec ou sans fichier
exports.uploadMessage = async (req, res) => {
  try {
    validateConnection(req.connection, 'Message');
    const Message = req.connection.models.Message;
    const { conversationId, senderId, content, senderName, senderfamilyName, participants } =
      JSON.parse(req.body.messageData);
    const file = req.file;
    // Générer l'URL du fichier
    const fileUrl = file ? `/uploads/${file.filename}` : null;
    const messageContent = determineMessageContent(file, content);
    // Créer et sauvegarder le message dans MongoDB
    const message = new Message({
      conversationId,
      senderId,
      content: messageContent,
      fileUrl,
      readBy: [senderId],
    });
    await message.save();
    // Émettre le message via Socket.IO
    const io = req.app.get('socketio');
    io.emit('newMessage', message);
    res.status(200).json({ message: 'Message envoyé avec succès', data: message });

    // Envoi des notifications push
    const notificationPromises = participants.map(async (participant) => {
      if (participant.expoPushToken && participant._id !== senderId) {
        await sendPushNotification(
          participant.expoPushToken,
          `Nouveau message de ${senderName} ${senderfamilyName}`,
          messageContent
        );
      }
    });
    await Promise.all(notificationPromises);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors de l'envoi du message" });
    }
  }
};


// Récupération des messages d'une conversation
exports.getMessagesByConversation = async (req, res) => {
  try {
    validateConnection(req.connection, 'Message');
    const Message = req.connection.models.Message;
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId }).sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
};

// Sauvegarder un message via Socket.IO
exports.saveMessageSocket = async (socket, messageData) => {
  try {
    validateConnection(socket.connection, 'Message');
    const Message = socket.connection.models.Message;
    const { conversationId, senderId, content, fileUrl = null } = messageData;
    const message = new Message({
      conversationId,
      senderId,
      content,
      fileUrl,
    });

    await message.save();
    return message;
  } catch (error) {
    throw error;
  }
};

// Marquer les messages comme lus
exports.markMessagesAsRead = async (req, res) => {
  try {
    validateConnection(req.connection, 'Message');
    const Message = req.connection.models.Message;
    const { conversationId, userId } = req.body;
    const result = await Message.updateMany(
      { conversationId, readBy: { $ne: userId } },
      { $push: { readBy: userId } }
    );
    res.status(200).json({ message: 'Messages marqués comme lus.' });
  } catch (error) {
    res.status(500).json({ error: 'Impossible de marquer les messages comme lus.' });
  }
};
