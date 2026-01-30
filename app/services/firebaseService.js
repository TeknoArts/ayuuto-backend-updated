var admin = require('firebase-admin');
const path = require('path');
const https = require('https');

// Initialize Firebase Admin SDK (for future use if needed)
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) {
    return;
  }

  try {
    let serviceAccount = null;
    
    // Priority 1: Check for environment variable (for cloud deployments)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        // Parse JSON from environment variable
        serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string' 
          ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
          : process.env.FIREBASE_SERVICE_ACCOUNT;
        console.log('✅ Loading Firebase service account from environment variable');
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable:', parseError.message);
        console.warn('Note: Using Expo Push Notification API instead of Firebase directly.');
        return;
      }
    } else {
      // Priority 2: Check for file (for local development)
      const serviceAccountPath = path.join(__dirname, '../../config/firebase-service-account.json');
      const fs = require('fs');
      
      if (fs.existsSync(serviceAccountPath)) {
        try {
          serviceAccount = require(serviceAccountPath);
          console.log('✅ Loading Firebase service account from file');
        } catch (fileError) {
          console.error('❌ Failed to load Firebase service account file:', fileError.message);
          console.warn('Note: Using Expo Push Notification API instead of Firebase directly.');
          return;
        }
      } else {
        console.warn('⚠️  Firebase service account key not found.');
        console.warn('   - File not found at:', serviceAccountPath);
        console.warn('   - Environment variable FIREBASE_SERVICE_ACCOUNT not set');
        console.warn('   - Note: Using Expo Push Notification API instead of Firebase directly.');
        console.warn('   - Push notifications will still work via Expo API');
        return;
      }
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.warn('⚠️  Firebase Admin SDK initialization skipped:', error.message);
    console.warn('   Note: Using Expo Push Notification API instead of Firebase directly.');
    console.warn('   Push notifications will still work via Expo API.');
  }
}

// Initialize on module load
initializeFirebase();

/**
 * Check if a token is an Expo push token
 */
function isExpoPushToken(token) {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[') && token.endsWith(']');
}

/**
 * Send push notification via Expo Push Notification API
 */
async function sendExpoPushNotification(token, title, body, data = {}) {
  return new Promise((resolve, reject) => {
    // Ensure token is in correct format
    let expoToken = token;
    if (!token.startsWith('ExponentPushToken[')) {
      expoToken = `ExponentPushToken[${token}]`;
    }
    
    const message = {
      to: expoToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    };

    const messages = [message];
    const postData = JSON.stringify(messages);

    console.log(`📤 Sending Expo notification to: ${expoToken.substring(0, 30)}...`);
    console.log(`   Title: ${title}`);
    console.log(`   Body: ${body}`);

    const options = {
      hostname: 'exp.host',
      port: 443,
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      // Handle gzip/deflate encoding
      let stream = res;
      if (res.headers['content-encoding'] === 'gzip') {
        const zlib = require('zlib');
        stream = zlib.createGunzip();
        res.pipe(stream);
      } else if (res.headers['content-encoding'] === 'deflate') {
        const zlib = require('zlib');
        stream = zlib.createInflate();
        res.pipe(stream);
      }

      stream.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      stream.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          console.log(`📥 Expo API Response:`, JSON.stringify(response, null, 2));
          
          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            const result = response.data[0];
            if (result.status === 'ok') {
              console.log(`✅ Expo notification sent successfully. Receipt ID: ${result.id}`);
              resolve({ success: true, id: result.id, receiptId: result.id });
            } else if (result.status === 'error') {
              const errorMsg = result.message || result.details?.error || 'Failed to send notification';
              console.error(`❌ Expo API error: ${errorMsg}`);
              reject(new Error(errorMsg));
            } else {
              console.error(`❌ Unknown status: ${result.status}`, result);
              reject(new Error(`Unknown status: ${result.status}`));
            }
          } else {
            console.error(`❌ Invalid response format:`, response);
            reject(new Error('Invalid response from Expo API - no data array'));
          }
        } catch (error) {
          console.error(`❌ Failed to parse response:`, error.message);
          console.error(`   Raw response:`, responseData);
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });

      stream.on('error', (error) => {
        console.error(`❌ Stream error:`, error.message);
        reject(error);
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Request error:`, error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.error(`❌ Request timeout`);
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(30000); // 30 second timeout

    req.write(postData);
    req.end();
  });
}

/**
 * Send push notification to a user
 * @param {string} userId - MongoDB user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send with notification
 * @returns {Promise} - Promise that resolves when notification is sent
 */
exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const User = require('../models/User');
    
    // CRITICAL SECURITY: We ALWAYS use User.findById(userId) - NEVER query by device ID or device name
    // Device names like "Redmi Note 9S" are NOT unique - multiple users can have the same device name
    // We MUST use userId (unique MongoDB ObjectId) to identify users
    // NEVER use: User.find({ 'pushTokens.deviceId': ... }) or similar device-based queries
    const user = await User.findById(userId).select('pushTokens');

    if (!user) {
      console.log(`User ${userId} not found`);
      return;
    }

    if (!user.pushTokens || user.pushTokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return;
    }

    // Separate Expo tokens and FCM tokens
    const expoTokens = [];
    const fcmTokens = [];

    user.pushTokens.forEach((tokenData) => {
      if (isExpoPushToken(tokenData.token)) {
        expoTokens.push(tokenData);
      } else {
        fcmTokens.push(tokenData);
      }
    });

    const results = [];
    const invalidTokens = [];

    // Send to Expo tokens using Expo API
    for (const tokenData of expoTokens) {
      try {
        const result = await sendExpoPushNotification(
          tokenData.token,
          title,
          body,
          data
        );
        results.push({ success: true, token: tokenData.token, result });
        console.log(`✅ Sent Expo notification to ${tokenData.token.substring(0, 20)}...`);
      } catch (error) {
        console.error(`❌ Failed to send Expo notification to ${tokenData.token.substring(0, 20)}...:`, error.message);
        results.push({ success: false, token: tokenData.token, error: error.message });
        
        // Check if token is invalid
        if (error.message.includes('Invalid') || error.message.includes('not registered')) {
          invalidTokens.push(tokenData.token);
        }
      }
    }

    // Send to FCM tokens using Firebase Admin SDK (if initialized)
    if (fcmTokens.length > 0 && firebaseInitialized) {
      try {
        const messages = fcmTokens.map((tokenData) => ({
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            type: data.type || 'default',
            ...Object.keys(data).reduce((acc, key) => {
              acc[key] = String(data[key]);
              return acc;
            }, {}),
          },
          token: tokenData.token,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        }));

        const responses = await admin.messaging().sendEach(messages);
        
        responses.forEach((response, index) => {
          if (response.success) {
            results.push({ success: true, token: fcmTokens[index].token, result: response });
            console.log(`✅ Sent FCM notification to ${fcmTokens[index].token.substring(0, 20)}...`);
          } else {
            const error = response.error;
            console.error(`❌ Failed to send FCM notification:`, error);
            results.push({ success: false, token: fcmTokens[index].token, error: error.message });
            
            if (
              error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered' ||
              error.code === 'messaging/invalid-argument'
            ) {
              invalidTokens.push(fcmTokens[index].token);
            }
          }
        });
      } catch (error) {
        console.error('Error sending FCM notifications:', error);
      }
    } else if (fcmTokens.length > 0 && !firebaseInitialized) {
      console.warn(`Skipping ${fcmTokens.length} FCM token(s) - Firebase not initialized`);
    }

    // Remove invalid tokens
    if (invalidTokens.length > 0) {
      user.pushTokens = user.pushTokens.filter(
        (t) => !invalidTokens.includes(t.token)
      );
      await user.save();
      console.log(`Removed ${invalidTokens.length} invalid push token(s) for user ${userId}`);
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`📱 Sent ${successCount}/${user.pushTokens.length} push notifications to user ${userId}`);

    return results;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send push notification to multiple users
 * @param {string[]} userIds - Array of MongoDB user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send with notification
 * @returns {Promise} - Promise that resolves when all notifications are sent
 */
exports.sendPushNotificationToUsers = async (userIds, title, body, data = {}) => {
  const promises = userIds.map((userId) => 
    this.sendPushNotification(userId, title, body, data).catch((error) => {
      console.error(`Error sending notification to user ${userId}:`, error);
      return null;
    })
  );
  return Promise.allSettled(promises);
};

/**
 * Send push notification to all group members
 * @param {object} group - Group object with participants
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to send with notification
 * @returns {Promise} - Promise that resolves when all notifications are sent
 */
exports.sendPushNotificationToGroup = async (group, title, body, data = {}) => {
  try {
    const User = require('../models/User');
    
    // Get all user IDs from group (creator + participants)
    const userIds = [group.createdBy];
    
    // If participants have user references, add them
    if (group.participants && group.participants.length > 0) {
      // Assuming participants might have user references or we need to find users by name
      // This depends on your data model
      // For now, we'll just notify the group creator
    }

    return await this.sendPushNotificationToUsers(userIds, title, body, {
      ...data,
      groupId: group._id.toString(),
    });
  } catch (error) {
    console.error('Error sending notification to group:', error);
    throw error;
  }
};

