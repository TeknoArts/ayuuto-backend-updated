/**
 * Update a group's collection date to today for testing
 * Run with: node update-group-for-test.js [groupId]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function updateGroupForTest() {
  try {
    console.log('🔧 Updating Group for Notification Test...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log('✅ Connected to MongoDB\n');

    const today = new Date();
    const todayDate = today.getDate();
    console.log(`📅 Today's date: ${todayDate}\n`);

    // Get group ID from command line or use first eligible group
    const groupId = process.argv[2];
    
    let group;
    if (groupId) {
      group = await Group.findById(groupId);
      if (!group) {
        console.log(`❌ Group not found with ID: ${groupId}\n`);
        await mongoose.connection.close();
        return;
      }
    } else {
      // Find first group with MONTHLY frequency and registered users
      group = await Group.findOne({
        frequency: 'MONTHLY',
        status: 'ACTIVE',
      }).populate('participants.user');
      
      if (!group) {
        console.log('❌ No eligible groups found.');
        console.log('   Please provide a group ID: node update-group-for-test.js <groupId>\n');
        await mongoose.connection.close();
        return;
      }
    }

    console.log(`📋 Found group: ${group.name}`);
    console.log(`   Current collection date: ${group.collectionDate || 'NOT SET'}`);
    console.log(`   Frequency: ${group.frequency || 'NOT SET'}`);
    console.log(`   Amount: ${group.amountPerPerson || 'NOT SET'}`);
    console.log(`   Participants with userId: ${group.participants.filter(p => p.user).length}\n`);

    // Update collection date to today
    const oldDate = group.collectionDate;
    group.collectionDate = todayDate;
    group.lastCollectionNotificationSent = null; // Reset so notification can be sent
    await group.save();

    console.log(`✅ Updated group "${group.name}"`);
    console.log(`   Collection date changed: ${oldDate || 'NOT SET'} → ${todayDate}`);
    console.log(`   Reset lastCollectionNotificationSent to allow notification\n`);

    console.log('🧪 Now run: node test-collection-notifications.js\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateGroupForTest();
