/**
 * Test script to manually trigger collection notifications
 * Run with: node test-collection-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { checkAndSendCollectionNotifications } = require('./app/services/schedulerService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function testCollectionNotifications() {
  try {
    console.log('🧪 Testing Collection Notifications...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Run the notification check
    console.log('🔔 Running collection notification check...\n');
    await checkAndSendCollectionNotifications();

    console.log('\n✅ Test completed!');
    console.log('\n📋 Check the logs above to see:');
    console.log('   - How many groups were found');
    console.log('   - Which groups received notifications');
    console.log('   - How many users were notified');
    console.log('   - Any errors that occurred\n');

    // Close connection
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error testing collection notifications:', error);
    process.exit(1);
  }
}

testCollectionNotifications();
