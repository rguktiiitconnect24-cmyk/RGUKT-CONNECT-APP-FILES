import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

export const notificationService = {
    async initialize(user) {
        if (!user || !user.uid) return;
        
        // Only initialize notifications on Native Android/iOS platforms
        if (Capacitor.isNativePlatform()) {
            try {
                await this.initNativePush(user.uid);
            } catch (error) {
                console.error('Error initializing native notifications:', error);
            }
        } else {
            console.log('Push notifications are disabled for the web platform.');
        }
    },

    async initNativePush(userId) {
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }
        
        if (permStatus.receive !== 'granted') {
            console.warn('User denied native push notification permissions');
            return;
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token: ' + token.value);
            await this.saveTokenToDb(userId, token.value, 'android');
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('Error on native push registration: ' + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Native push received: ', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Native push action performed: ', notification);
        });
    },

    async saveTokenToDb(userId, token, platform) {
        try {
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
                fcmToken: token,
                fcmPlatform: platform,
                tokenUpdatedAt: new Date()
            }, { merge: true });
            console.log(`Saved ${platform} FCM token for user ${userId}`);
        } catch (error) {
            console.error('Error saving FCM token to DB:', error);
        }
    }
};
