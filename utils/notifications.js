// utils/notifications.js
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

async function sendPushNotification(expoPushToken, message) {
    if (!Expo.isExpoPushToken(expoPushToken)) {
        return;
    }

    const messages = [{
        to: expoPushToken,
        sound: 'default',
        body: message,
        data: { withSome: 'data' },
    }];

    try {
        let tickets = await expo.sendPushNotificationsAsync(messages);
        
    } catch (error) {
        console.error('Erreur d\'envoi de la notification:', error);
    }
}

module.exports = { sendPushNotification };
