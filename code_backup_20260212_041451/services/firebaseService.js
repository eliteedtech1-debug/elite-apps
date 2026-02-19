const admin = require('firebase-admin');

class FirebaseService {
  constructor() {
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    try {
      // Initialize Firebase Admin (add your service account key)
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        this.initialized = true;
        console.log('Firebase initialized successfully');
      }
    } catch (error) {
      console.error('Firebase initialization failed:', error);
    }
  }

  async sendPushNotification(tokens, notification) {
    if (!this.initialized || !tokens.length) return;

    const message = {
      notification: {
        title: notification.title,
        body: notification.message
      },
      data: {
        type: notification.type,
        category: notification.category,
        id: notification.id?.toString() || ''
      },
      tokens: Array.isArray(tokens) ? tokens : [tokens]
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log('Push notifications sent:', response.successCount);
      
      // Clean up invalid tokens
      if (response.failureCount > 0) {
        await this.cleanupInvalidTokens(tokens, response.responses);
      }
      
      return response;
    } catch (error) {
      console.error('Push notification error:', error);
      return null;
    }
  }

  async cleanupInvalidTokens(tokens, responses) {
    const db = require('../models');
    const invalidTokens = [];
    
    responses.forEach((response, index) => {
      if (!response.success && 
          (response.error?.code === 'messaging/invalid-registration-token' ||
           response.error?.code === 'messaging/registration-token-not-registered')) {
        invalidTokens.push(tokens[index]);
      }
    });

    if (invalidTokens.length > 0) {
      await db.sequelize.query(
        'UPDATE user_fcm_tokens SET is_active = 0 WHERE token IN (:tokens)',
        { replacements: { tokens: invalidTokens } }
      );
    }
  }
}

module.exports = new FirebaseService();
