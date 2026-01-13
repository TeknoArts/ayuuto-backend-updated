/**
 * Count groups with collection date 14 and MONTHLY frequency
 * Run with: node count-groups-date-14.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
const TARGET_COLLECTION_DATE = 14;

async function countGroups() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all groups with collection date 14 and MONTHLY frequency
    const groups = await Group.find({
      collectionDate: TARGET_COLLECTION_DATE,
      frequency: 'MONTHLY',
    })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    console.log(`📊 Groups with Collection Date ${TARGET_COLLECTION_DATE} and MONTHLY frequency:\n`);
    console.log(`Total Count: ${groups.length}\n`);

    if (groups.length === 0) {
      console.log('❌ No groups found with collection date 14 and MONTHLY frequency\n');
      await mongoose.connection.close();
      return;
    }

    // Display details of each group
    groups.forEach((group, index) => {
      console.log(`Group ${index + 1}: ${group.name}`);
      console.log(`   ID: ${group._id}`);
      console.log(`   Status: ${group.status}`);
      console.log(`   Frequency: ${group.frequency}`);
      console.log(`   Collection Date: ${group.collectionDate}`);
      console.log(`   Amount Per Person: $${group.amountPerPerson || 0}`);
      console.log(`   Member Count: ${group.memberCount || 0}`);
      console.log(`   Total Participants: ${group.participants.length}`);
      
      const registeredParticipants = group.participants.filter(p => p.user).length;
      const unregisteredParticipants = group.participants.length - registeredParticipants;
      console.log(`   Registered Users: ${registeredParticipants}`);
      console.log(`   Unregistered Users: ${unregisteredParticipants}`);
      
      if (group.createdBy) {
        const creatorName = group.createdBy.name || group.createdBy.email || 'Unknown';
        console.log(`   Created By: ${creatorName}`);
      }
      
      if (group.lastCollectionNotificationSent) {
        console.log(`   Last Notification Sent: ${new Date(group.lastCollectionNotificationSent).toLocaleString()}`);
      } else {
        console.log(`   Last Notification Sent: Never`);
      }
      
      console.log('');
    });

    // Summary statistics
    console.log('\n📊 Summary Statistics:\n');
    console.log(`Total Groups: ${groups.length}`);
    
    const activeGroups = groups.filter(g => g.status === 'ACTIVE').length;
    const completedGroups = groups.filter(g => g.status === 'COMPLETED').length;
    const cancelledGroups = groups.filter(g => g.status === 'CANCELLED').length;
    
    console.log(`   Active: ${activeGroups}`);
    console.log(`   Completed: ${completedGroups}`);
    console.log(`   Cancelled: ${cancelledGroups}`);
    
    const groupsWithRegisteredUsers = groups.filter(g => 
      g.participants.some(p => p.user)
    ).length;
    console.log(`   Groups with Registered Users: ${groupsWithRegisteredUsers}`);
    
    const totalParticipants = groups.reduce((sum, g) => sum + g.participants.length, 0);
    const totalRegisteredParticipants = groups.reduce((sum, g) => 
      sum + g.participants.filter(p => p.user).length, 0
    );
    console.log(`   Total Participants (all groups): ${totalParticipants}`);
    console.log(`   Total Registered Participants: ${totalRegisteredParticipants}`);

    await mongoose.connection.close();
    console.log('\n📡 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

countGroups();
