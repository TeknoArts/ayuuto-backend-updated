# Firebase Push Notifications Setup Instructions

## Step 1: Install Firebase Admin SDK

```bash
cd ayuuto-backend
npm install firebase-admin
```

## Step 2: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one for Ayuuto)
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select "Project settings"
5. Go to the "Service accounts" tab
6. Click "Generate new private key"
7. Download the JSON file
8. **Rename it to `firebase-service-account.json`**
9. **Place it in `ayuuto-backend/config/` directory**

⚠️ **IMPORTANT**: This file contains sensitive credentials. It's already added to `.gitignore` - **DO NOT COMMIT IT TO GIT**.

## Step 3: Verify File Location

The service account key should be at:
```
ayuuto-backend/config/firebase-service-account.json
```

## Step 4: Test Firebase Initialization

When you start your backend server, you should see:
```
Firebase Admin SDK initialized successfully
```

If you see a warning instead, check:
- File exists at the correct path
- File is valid JSON
- File has proper permissions

## Step 5: Test Push Notifications

Once set up, push notifications will be sent automatically when:
- ✅ Payment status is updated (marked as paid)
- ✅ Next round starts
- ✅ Group is completed

## Notification Types

The app sends different types of notifications:

1. **Payment Notification** (`type: 'payment'`)
   - Sent when a participant marks payment as complete
   - Includes: `groupId`, `participantId`, `participantName`

2. **Next Round Notification** (`type: 'next_round'`)
   - Sent when a new round starts
   - Includes: `groupId`, `recipientName`, `roundNumber`

3. **Group Completed Notification** (`type: 'group_completed'`)
   - Sent when all members have received payments
   - Includes: `groupId`

## Troubleshooting

### Firebase not initializing
- Check that `config/firebase-service-account.json` exists
- Verify the JSON file is valid
- Check file permissions

### Notifications not sending
- Ensure users have registered push tokens (happens automatically on login)
- Check Firebase Console for delivery status
- Verify Firebase project has FCM enabled

### Invalid tokens
- The system automatically removes invalid tokens
- Users need to re-login to register new tokens

