/**
 * Diagnostic script to check notification setup
 * 
 * Usage: node check-notification-setup.js USER_ID
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
const User = require('./app/models/User');

async function checkSetup(userId) {
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findById(userId).select('name email pushTokens');
    
    if (!user) {
      console.log(`❌ User ${userId} not found`);
      process.exit(1);
    }

    console.log(`👤 User: ${user.name} (${user.email})`);
    console.log(`📱 Push Tokens: ${user.pushTokens ? user.pushTokens.length : 0}\n`);

    if (!user.pushTokens || user.pushTokens.length === 0) {
      console.log('❌ No push tokens found!');
      console.log('\nTo fix:');
      console.log('1. Make sure app is running on a physical device');
      console.log('2. Login to the app - this will register the push token');
      console.log('3. Check backend logs for: "Push token registered: ExponentPushToken[...]"');
      process.exit(1);
    }

    // Check each token
    user.pushTokens.forEach((tokenData, index) => {
      console.log(`\n📱 Token ${index + 1}:`);
      console.log(`   Token: ${tokenData.token.substring(0, 50)}...`);
      console.log(`   Platform: ${tokenData.platform}`);
      console.log(`   Device ID: ${tokenData.deviceId || 'N/A'}`);
      console.log(`   Created: ${tokenData.createdAt}`);
      
      // Check if it's an Expo token
      if (tokenData.token.startsWith('ExponentPushToken[')) {
        console.log(`   ✅ Valid Expo push token format`);
      } else {
        console.log(`   ⚠️  Not an Expo token - will use Firebase (if configured)`);
      }
    });

    // Check Firebase service account
    const fs = require('fs');
    const path = require('path');
    const serviceAccountPath = path.join(__dirname, 'config/firebase-service-account.json');
    
    console.log('\n🔥 Firebase Configuration:');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('   ✅ Firebase service account key found');
      try {
        const serviceAccount = require(serviceAccountPath);
        console.log(`   Project ID: ${serviceAccount.project_id || 'N/A'}`);
      } catch (error) {
        console.log('   ❌ Error reading service account key:', error.message);
      }
    } else {
      console.log('   ⚠️  Firebase service account key not found');
      console.log('   (This is OK if you only use Expo tokens)');
    }

    console.log('\n✅ Setup check complete!');
    console.log('\nTo test notifications:');
    console.log('1. Make sure backend is running');
    console.log('2. Run: node test-notification.js (with your auth token)');
    console.log('3. Or trigger through app actions (mark payment, next round, etc.)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get user ID from command line
const userId = process.argv[2];

if (!userId) {
  console.log('Usage: node check-notification-setup.js USER_ID');
  console.log('\nTo find your user ID:');
  console.log('1. Login to the app');
  console.log('2. Check backend logs when you login');
  console.log('3. Or query MongoDB: db.users.find({}, {_id: 1, name: 1, email: 1})');
  process.exit(1);
}

checkSetup(userId);

