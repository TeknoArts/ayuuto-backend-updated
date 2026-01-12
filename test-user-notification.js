require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./app/models/User');
const notificationService = require('./app/services/notificationService');

/**
 * Test sending notification to a specific user
 * Usage: node test-user-notification.js <userEmail>
 */

async function testUserNotification(userEmail) {
  try {
    console.log('🧪 Testing Notification for User...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto');
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: userEmail.toLowerCase().trim() });
    
    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      await mongoose.connection.close();
      return;
    }

    console.log(`👤 User found: ${user.name || user.email}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Email: ${user.email}\n`);

    // Check push tokens
    console.log(`📱 Push Token Status:`);
    if (!user.pushTokens || user.pushTokens.length === 0) {
      console.log(`   ❌ No push tokens registered`);
      console.log(`   ℹ️  User needs to register their device in the app`);
      console.log(`   ℹ️  Notifications will be saved in database but not sent as push`);
    } else {
      console.log(`   ✅ Found ${user.pushTokens.length} push token(s):`);
      user.pushTokens.forEach((token, idx) => {
        console.log(`      ${idx + 1}. Platform: ${token.platform}`);
        console.log(`         Token: ${token.token.substring(0, 30)}...`);
        console.log(`         Device ID: ${token.deviceId || 'N/A'}`);
        console.log(`         Registered: ${token.registeredAt || 'N/A'}`);
      });
    }

    console.log(`\n📤 Sending test notification...\n`);

    // Send test notification
    const result = await notificationService.sendNotificationToUser({
      userId: user._id.toString(),
      title: '🧪 Test Notification',
      body: `This is a test notification for ${user.name || user.email}`,
      type: 'test',
      data: {
        type: 'test',
        message: 'Test notification from backend',
      },
    });

    console.log(`✅ Notification sent!`);
    console.log(`   Notification ID: ${result.notification._id}`);
    console.log(`   Push Results: ${result.results ? 'Sent' : 'No push tokens'}`);

    if (result.results) {
      console.log(`\n📊 Push Notification Details:`);
      result.results.forEach((result, idx) => {
        console.log(`   ${idx + 1}. Status: ${result.status || 'sent'}`);
        if (result.receiptId) {
          console.log(`      Receipt ID: ${result.receiptId}`);
        }
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

// Get email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node test-user-notification.js <userEmail>');
  console.log('Example: node test-user-notification.js user@example.com');
  process.exit(1);
}

testUserNotification(userEmail);
