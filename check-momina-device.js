/**
 * Check what device Momina is using
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function checkMominaDevice() {
  try {
    console.log('🔍 Checking Momina\'s device information...\n');
    
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log('✅ Connected to MongoDB\n');

    // Find Momina
    const momina = await User.findOne({
      $or: [
        { name: { $regex: /momina/i } },
        { email: { $regex: /momina/i } }
      ]
    }).select('name email pushTokens deviceId platform createdAt updatedAt');

    if (!momina) {
      console.log('❌ Momina not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found: ${momina.name} (${momina.email})`);
    console.log(`   User ID: ${momina._id}`);
    console.log(`   Created: ${momina.createdAt ? new Date(momina.createdAt).toLocaleString() : 'N/A'}`);
    console.log(`   Last Updated: ${momina.updatedAt ? new Date(momina.updatedAt).toLocaleString() : 'N/A'}\n`);

    // Check push tokens for device/platform info
    if (momina.pushTokens && momina.pushTokens.length > 0) {
      console.log(`📱 Push Tokens (${momina.pushTokens.length}):\n`);
      
      momina.pushTokens.forEach((tokenData, index) => {
        console.log(`   Token ${index + 1}:`);
        console.log(`      Token: ${tokenData.token ? tokenData.token.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`      Platform: ${tokenData.platform || 'N/A'}`);
        console.log(`      Device ID: ${tokenData.deviceId || 'N/A'}`);
        console.log(`      Created: ${tokenData.createdAt ? new Date(tokenData.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`      Updated: ${tokenData.updatedAt ? new Date(tokenData.updatedAt).toLocaleString() : 'N/A'}`);
        
        // Determine device type from token
        if (tokenData.token) {
          if (tokenData.token.startsWith('ExponentPushToken[')) {
            console.log(`      Token Type: Expo Push Token`);
          } else {
            console.log(`      Token Type: FCM Token (Firebase)`);
          }
        }
        
        // Determine platform
        if (tokenData.platform) {
          const platform = tokenData.platform.toLowerCase();
          if (platform === 'ios' || platform === 'ios') {
            console.log(`      Device: iOS (iPhone/iPad)`);
          } else if (platform === 'android') {
            console.log(`      Device: Android (Phone/Tablet)`);
          } else if (platform === 'web') {
            console.log(`      Device: Web Browser`);
          } else {
            console.log(`      Device: ${tokenData.platform}`);
          }
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No push tokens found for Momina');
      console.log('   This means Momina may not have registered for push notifications yet\n');
    }

    // Check if there's a deviceId field at user level
    if (momina.deviceId) {
      console.log(`📱 Device ID (User Level): ${momina.deviceId}\n`);
    }

    // Check platform field at user level
    if (momina.platform) {
      console.log(`📱 Platform (User Level): ${momina.platform}\n`);
    }

    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkMominaDevice();
