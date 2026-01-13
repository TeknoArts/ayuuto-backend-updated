/**
 * Test script to check and send notifications for groups with collection date 14
 * Run with: node test-date-14-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');
const notificationService = require('./app/services/notificationService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
const TARGET_COLLECTION_DATE = 14; // Test for groups with collection date 14

async function testDate14Notifications() {
  try {
    console.log('🧪 Testing Notifications for Groups with Collection Date 14...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all groups with collection date 14
    console.log(`🔍 Searching for groups with collection date: ${TARGET_COLLECTION_DATE}...\n`);
    
    const groups = await Group.find({
      collectionDate: TARGET_COLLECTION_DATE,
    })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    console.log(`📋 Found ${groups.length} group(s) with collection date ${TARGET_COLLECTION_DATE}:\n`);

    if (groups.length === 0) {
      console.log('❌ No groups found with collection date 14');
      console.log('\n💡 To test:');
      console.log('   1. Create a group with MONTHLY frequency');
      console.log('   2. Set collection date to 14');
      console.log('   3. Add participants with registered users');
      console.log('   4. Run this script again\n');
      await mongoose.connection.close();
      return;
    }

    // Display all groups found
    groups.forEach((group, index) => {
      console.log(`Group ${index + 1}: ${group.name}`);
      console.log(`   Status: ${group.status}`);
      console.log(`   Frequency: ${group.frequency || 'NOT SET'}`);
      console.log(`   Collection Date: ${group.collectionDate}`);
      console.log(`   Amount Per Person: $${group.amountPerPerson || 0}`);
      console.log(`   Participants: ${group.participants.length}`);
      const registeredParticipants = group.participants.filter(p => p.user).length;
      console.log(`   Registered Users: ${registeredParticipants}`);
      console.log('');
    });

    // Filter eligible groups (ACTIVE, MONTHLY, has amount, has registered users)
    const eligibleGroups = groups.filter(group => {
      const hasRegisteredUsers = group.participants.some(p => p.user);
      return (
        group.status === 'ACTIVE' &&
        group.frequency === 'MONTHLY' &&
        group.amountPerPerson > 0 &&
        hasRegisteredUsers
      );
    });

    console.log(`\n✅ Eligible groups for notification: ${eligibleGroups.length}\n`);

    if (eligibleGroups.length === 0) {
      console.log('⚠️  No eligible groups found. Groups must be:');
      console.log('   - Status: ACTIVE');
      console.log('   - Frequency: MONTHLY');
      console.log('   - Amount Per Person: > 0');
      console.log('   - Have at least one registered user participant\n');
      await mongoose.connection.close();
      return;
    }

    // Process each eligible group
    for (const group of eligibleGroups) {
      try {
        console.log(`\n📤 Processing group: ${group.name}`);
        console.log(`   Collection Date: ${group.collectionDate}`);
        console.log(`   Frequency: ${group.frequency}`);
        console.log(`   Amount: $${group.amountPerPerson}\n`);

        // Reset lastCollectionNotificationSent to allow testing
        // This allows us to test even if notification was sent recently
        console.log('   🔄 Resetting lastCollectionNotificationSent for testing...');
        group.lastCollectionNotificationSent = null;
        await group.save();

        // Get ONLY participants who are in this specific group
        const participantUserIds = [];
        const participantNames = [];
        const userIdsSet = new Set();

        // Only include participants who have userId (registered users in this group)
        group.participants.forEach((participant) => {
          if (participant.user) {
            const userId = participant.user._id ? participant.user._id : participant.user;
            const userIdString = userId.toString();

            if (!userIdsSet.has(userIdString)) {
              const userName = participant.user.name || participant.user.email || participant.name || 'Unknown';
              participantUserIds.push(userId);
              participantNames.push(userName);
              userIdsSet.add(userIdString);
              console.log(`   ✅ Participant: ${userName} (userId: ${userIdString})`);
            }
          }
        });

        // Also include the group creator if not already a participant
        const creatorId = group.createdBy._id ? group.createdBy._id : group.createdBy;
        const creatorIdString = creatorId ? creatorId.toString() : null;
        const creatorName = group.createdBy.name || group.createdBy.email || 'Group Creator';

        if (creatorIdString && !userIdsSet.has(creatorIdString)) {
          const isCreatorInParticipants = group.participants.some((p) => {
            if (!p.user) return false;
            const pUserId = p.user._id ? p.user._id : p.user;
            return pUserId.toString() === creatorIdString;
          });

          if (!isCreatorInParticipants) {
            participantUserIds.push(creatorId);
            participantNames.push(creatorName);
            userIdsSet.add(creatorIdString);
            console.log(`   ✅ Group Creator: ${creatorName} (userId: ${creatorIdString})`);
          }
        }

        if (participantUserIds.length === 0) {
          console.log(`   ⚠️  No registered users in this group to notify`);
          continue;
        }

        // Prepare notification message
        const title = `💰 Collection Reminder: ${group.name}`;
        const body = `It's collection day! Please contribute $${group.amountPerPerson} for ${group.name}.`;

        console.log(`\n   📤 Sending notifications to ${participantUserIds.length} user(s):`);

        // Send notifications with security verification
        const notificationPromises = participantUserIds.map((userId, index) => {
          const userName = participantNames[index] || 'User';
          const userIdString = userId.toString();

          // Final verification: Check if this user is actually in this group
          const isParticipant = group.participants.some((p) => {
            if (!p.user) return false;
            const pUserId = p.user._id ? p.user._id : p.user;
            return pUserId.toString() === userIdString;
          });

          const isCreator = creatorIdString && creatorIdString === userIdString;

          if (!isParticipant && !isCreator) {
            console.error(`   ❌ SECURITY ERROR: User ${userName} is NOT in group - SKIPPING`);
            return Promise.resolve(null);
          }

          return notificationService.sendNotificationToUser({
            userId: userIdString,
            title,
            body,
            type: 'collection_reminder',
            data: {
              type: 'collection_reminder',
              groupId: group._id.toString(),
              groupName: group.name,
              amountPerPerson: group.amountPerPerson,
              collectionDate: group.collectionDate,
              frequency: group.frequency,
            },
          }).then(() => {
            console.log(`   ✅ Notification sent to: ${userName}`);
          }).catch((error) => {
            console.error(`   ❌ Error sending to ${userName}:`, error.message || error);
            return null;
          });
        });

        await Promise.all(notificationPromises);

        // Update last notification sent date
        group.lastCollectionNotificationSent = new Date();
        await group.save();

        console.log(`   ✅ Successfully sent notifications for group: ${group.name}\n`);
      } catch (groupError) {
        console.error(`   ❌ Error processing group ${group.name}:`, groupError);
      }
    }

    console.log('\n✅ Test completed!');
    console.log('\n📋 Summary:');
    console.log(`   - Total groups with date 14: ${groups.length}`);
    console.log(`   - Eligible groups: ${eligibleGroups.length}`);
    console.log(`   - Notifications sent: ${eligibleGroups.length} group(s)\n`);

    // Close connection
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error testing notifications:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testDate14Notifications();
