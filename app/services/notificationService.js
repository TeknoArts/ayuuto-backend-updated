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

/**
 * Send notification to all participants in a group (including the creator)
 * @param {Object} group - Group object with participants array
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {string} [type] - Optional notification type
 * @param {Object} [data] - Optional extra payload data
 * @param {string} [excludeUserId] - Optional user ID to exclude from notifications
 * @returns {Promise<Array>} - Array of notification results
 */
exports.sendNotificationToGroup = async (group, title, body, type, data = {}, excludeUserId = null) => {
  const userIds = new Set();
  const results = [];

  // Add group creator
  if (group.createdBy) {
    const creatorId = group.createdBy._id ? group.createdBy._id.toString() : group.createdBy.toString();
    if (!excludeUserId || creatorId !== excludeUserId) {
      userIds.add(creatorId);
    }
  }

  // Add all participants who have a user account (registered users)
  if (group.participants && Array.isArray(group.participants)) {
    for (const participant of group.participants) {
      if (participant.user) {
        const userId = participant.user._id ? participant.user._id.toString() : participant.user.toString();
        if (!excludeUserId || userId !== excludeUserId) {
          userIds.add(userId);
        }
      }
    }
  }

  console.log(`[NOTIFICATION] Sending "${title}" to ${userIds.size} group member(s) in "${group.name}"`);

  // Send notification to each user
  const notificationPromises = Array.from(userIds).map(async (userId) => {
    try {
      const result = await this.sendNotificationToUser({
        userId,
        title,
        body,
        type,
        data: {
          ...data,
          groupId: group._id.toString(),
          groupName: group.name,
        },
      });
      return { userId, success: true, result };
    } catch (error) {
      console.error(`[NOTIFICATION] Error sending to user ${userId}:`, error);
      return { userId, success: false, error: error.message };
    }
  });

  const notificationResults = await Promise.allSettled(notificationPromises);
  
  notificationResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      console.error(`[NOTIFICATION] Promise rejected for user at index ${index}:`, result.reason);
      results.push({ success: false, error: result.reason });
    }
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`[NOTIFICATION] ✅ Sent ${successCount}/${userIds.size} notification(s) successfully`);

  return results;
};



