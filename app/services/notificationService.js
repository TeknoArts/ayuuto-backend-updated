const Notification = require('../models/Notification');
const { sendPushNotification } = require('./firebaseService');

/**
 * Create a notification record for a user and send a push notification
 * using the existing Firebase / Expo push integration.
 *
 * @param {Object} params
 * @param {string} params.userId - MongoDB ObjectId string of the User
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body text
 * @param {string} [params.type] - Optional logical type, e.g. 'payment', 'group_completed'
 * @param {Object} [params.data] - Optional extra payload data
 * @returns {Promise<{notification: any, results: any[] | null}>}
 */
exports.sendNotificationToUser = async ({ userId, title, body, type, data }) => {
  // 1) Persist notification in database
  const notification = await Notification.create({
    user: userId,
    title,
    body,
    type,
    data,
  });

  // 2) Attempt to send push notification via existing Firebase/Expo service
  let results = null;
  try {
    results = await sendPushNotification(
      userId,
      title,
      body,
      {
        ...(data || {}),
        type: type || (data && data.type) || 'generic',
        notificationId: notification._id.toString(),
      }
    );
  } catch (err) {
    console.error('Error sending push notification:', err);
  }

  return { notification, results };
};



