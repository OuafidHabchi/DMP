// utils/notifications.js
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushNotification(expoPushToken, message, screenName = '') {
    if (!Expo.isExpoPushToken(expoPushToken)) {
        return;
    }

    // Vérifiez si screenName est vide ou indéfini, sinon définissez-le sur "unknown"
    const finalScreenName = screenName || 'unknown';

    const messages = [{
        to: expoPushToken,
        sound: 'default',
        body: message,
        data: { 
            screen: finalScreenName,
            url: `myapp://app/${finalScreenName}`
        }
    }];
    
    // Log message details
    console.log('Message to be sent:', messages);
    
    try {
        let tickets = await expo.sendPushNotificationsAsync(messages);
        // Vous pouvez traiter les tickets ou vérifier les réponses ici si nécessaire
    } catch (error) {
        console.error('[ERROR] Erreur d\'envoi de notification:', error);
    }
}

module.exports = { sendPushNotification };
