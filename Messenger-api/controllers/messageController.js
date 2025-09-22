const storage = require('../../utils/storage/index');
const { sendPushNotification } = require('../../utils/notifications');

// Utilitaire
const validateConnection = (connection, modelName) => {
  if (!connection || !connection.models[modelName]) {
    throw new Error(`La connexion ou le modèle ${modelName} est introuvable.`);
  }
};

const determineMessageContent = (file, content) => {
  if (file) {
    if (file.mimetype.startsWith('video/')) return '';
    if (file.mimetype.startsWith('image/')) return '';
    if (file.mimetype.startsWith('audio/')) return '';
    return '';
  }
  return content || '';
};

// Envoi d'un message avec ou sans fichier
exports.uploadMessage = async (req, res) => {
  try {
    validateConnection(req.connection, 'Message');
    const Message = req.connection.models.Message;

    const { conversationId, senderId, content, senderName, senderfamilyName, participants } =
      JSON.parse(req.body.messageData);

    const file = req.file;
    let fileUrl = null;

    if (file) {
      const up = await storage.upload({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        pathPrefix: `messages/${conversationId}`,
      });
      fileUrl = up.url;
    }

    const messageContent = determineMessageContent(file, content);

    const message = new Message({
      conversationId,
      senderId,
      content: messageContent,
      fileUrl,
      readBy: [senderId],
    });
    await message.save();

    const io = req.app.get('socketio');
    io.emit('newMessage', message);

    res.status(200).json({ message: 'Message envoyé avec succès', data: message });

    const notificationPromises = participants.map(async (participant) => {
      if (participant.expoPushToken && participant._id !== senderId) {
        const screen =
          participant.role === 'manager'
            ? '(manager)/(tabs)/(messenger)/Messenger'
            : '(driver)/(tabs)/(messenger)/Messenger';

        await sendPushNotification(
          participant.expoPushToken,
          `${senderName} ${senderfamilyName} send you a message`,
          screen
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

// Récupérer les messages avec pagination
exports.getMessagesByConversation = async (req, res) => {
  try {
    validateConnection(req.connection, 'Message');
    const Message = req.connection.models.Message;
    const { conversationId } = req.params;
    const { page = 1, limit = 40 } = req.query;

    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json(messages.reverse());
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

    await Message.updateMany(
      { conversationId, readBy: { $ne: userId } },
      { $push: { readBy: userId } }
    );

    res.status(200).json({ message: 'Messages marqués comme lus.' });
  } catch (error) {
    res.status(500).json({ error: 'Impossible de marquer les messages comme lus.' });
  }
};
