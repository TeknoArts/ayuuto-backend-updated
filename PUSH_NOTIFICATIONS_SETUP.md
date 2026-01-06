# Push Notifications Setup Guide

This guide explains how to set up FCM (Firebase Cloud Messaging) push notifications for the Ayuuto app.

## Backend Setup

### 1. Add Push Token Field to User Model

Update `app/models/User.js` to include push token fields:

```javascript
const userSchema = new mongoose.Schema(
  {
    // ... existing fields ...
    pushTokens: [{
      token: {
        type: String,
        required: true,
      },
      platform: {
        type: String,
        enum: ['ios', 'android', 'web'],
        required: true,
      },
      deviceId: {
        type: String,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);
```

### 2. Create Push Token Route

Create `app/routes/userRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { registerPushToken } = require('../controllers/userController');

router.post('/push-token', protect, registerPushToken);

module.exports = router;
```

### 3. Create Push Token Controller

Add to `app/controllers/userController.js`:

```javascript
const User = require('../models/User');

// @desc    Register push notification token
// @route   POST /api/users/push-token
// @access  Private
exports.registerPushToken = async (req, res, next) => {
  try {
    const { pushToken, platform, deviceId } = req.body;
    const userId = req.user.id;

    if (!pushToken || !platform) {
      return res.status(400).json({
        success: false,
        message: 'Push token and platform are required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove existing token for this device/platform if exists
    user.pushTokens = user.pushTokens.filter(
      (t) => !(t.token === pushToken || (deviceId && t.deviceId === deviceId && t.platform === platform))
    );

    // Add new token
    user.pushTokens.push({
      token: pushToken,
      platform,
      deviceId,
    });

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
    });
  } catch (err) {
    next(err);
  }
};
```

### 4. Install Firebase Admin SDK

```bash
cd ayuuto-backend
npm install firebase-admin
```

### 5. Create Firebase Service

Create `app/services/firebaseService.js`:

```javascript
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to download service account key from Firebase Console)
if (!admin.apps.length) {
  const serviceAccount = require('../config/firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Send push notification to a user
 */
exports.sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('pushTokens');

    if (!user || !user.pushTokens || user.pushTokens.length === 0) {
      console.log(`No push tokens found for user ${userId}`);
      return;
    }

    const messages = user.pushTokens.map((tokenData) => ({
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        type: data.type || 'default',
      },
      token: tokenData.token,
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    }));

    const responses = await admin.messaging().sendEach(messages);
    
    // Remove invalid tokens
    const invalidTokens = [];
    responses.forEach((response, index) => {
      if (!response.success) {
        if (response.error.code === 'messaging/invalid-registration-token' ||
            response.error.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(user.pushTokens[index].token);
        }
      }
    });

    if (invalidTokens.length > 0) {
      user.pushTokens = user.pushTokens.filter(
        (t) => !invalidTokens.includes(t.token)
      );
      await user.save();
    }

    return responses;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send notification to multiple users
 */
exports.sendPushNotificationToUsers = async (userIds, title, body, data = {}) => {
  const promises = userIds.map((userId) => 
    this.sendPushNotification(userId, title, body, data)
  );
  return Promise.allSettled(promises);
};
```

### 6. Example: Send Notification on Payment

In `app/controllers/groupController.js`, add notification when payment is updated:

```javascript
const { sendPushNotification } = require('../services/firebaseService');

// In updatePaymentStatus function, after updating payment:
if (participant.isPaid) {
  // Notify group owner
  await sendPushNotification(
    group.createdBy,
    'Payment Received',
    `${participant.name} has marked their payment as complete`,
    {
      type: 'payment',
      groupId: group._id.toString(),
      participantId: participant._id.toString(),
    }
  );
}
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd ayuuto-mobile
npm install expo-notifications expo-device
```

### 2. Configure Expo Project

1. Go to [Expo Dashboard](https://expo.dev)
2. Create or select your project
3. Get your Project ID
4. Update `app.json` with your project ID (or use EAS)

### 3. Update app.json

The `app.json` has been updated with notification configuration.

### 4. Get Expo Project ID

You can either:
- Use EAS (Expo Application Services) - recommended
- Or manually set project ID in `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

## Testing

### Test Push Notifications

1. Run the app on a physical device (notifications don't work on simulators)
2. Login to the app
3. Check console logs for push token registration
4. Send a test notification from backend using the Firebase service

### Test Notification from Backend

```javascript
const { sendPushNotification } = require('./app/services/firebaseService');

// Send test notification
await sendPushNotification(
  userId,
  'Test Notification',
  'This is a test push notification',
  {
    type: 'test',
    groupId: 'some-group-id',
  }
);
```

## Notification Types

You can send different types of notifications:

- **Payment**: When a participant marks payment as complete
- **Next Round**: When a new round starts
- **Group Update**: When group details are updated
- **Reminder**: Payment reminders or collection day reminders

## Next Steps

1. Set up Firebase project and download service account key
2. Add Firebase service account JSON to `ayuuto-backend/app/config/firebase-service-account.json`
3. Update User model with pushTokens field
4. Create user routes and controller
5. Test push notifications on physical devices
6. Implement notification sending for various events (payments, rounds, etc.)

