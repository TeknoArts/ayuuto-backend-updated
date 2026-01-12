require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');
const notificationService = require('./app/services/notificationService');

/**
 * Send collection notification to a specific group
 * Usage: node send-notification-to-group.js <groupName>
 */

async function sendNotificationToGroup(groupName) {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto');
    console.log('✅ Connected to MongoDB\n');

    // Find the group
    const group = await Group.findOne({ name: groupName })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    if (!group) {
      console.log(`❌ Group not found: ${groupName}`);
      console.log('\nAvailable groups:');
      const allGroups = await Group.find({}).select('name status frequency collectionDate');
      allGroups.forEach((g, idx) => {
        console.log(`   ${idx + 1}. ${g.name} (${g.status})`);
      });
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Group found: ${group.name}`);
    console.log(`   Status: ${group.status}`);
    console.log(`   Frequency: ${group.frequency || 'N/A'}`);
    console.log(`   Collection Date: ${group.collectionDate || 'N/A'}`);
    console.log(`   Amount Per Person: $${group.amountPerPerson || 0}\n`);

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
      console.log(`\n⚠️  No registered users in this group to notify`);
      await mongoose.connection.close();
      return;
    }

    // Prepare notification message
    const title = `💰 Collection Reminder: ${group.name}`;
    const body = `It's collection day! Please contribute $${group.amountPerPerson} for ${group.name}.`;

    console.log(`\n📤 Sending collection notification for group: ${group.name}`);
    console.log(`👥 Notifying ${participantUserIds.length} user(s) in this group:`);
    participantNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });

    console.log(`\n🔒 Security Check: Verifying all ${participantUserIds.length} user(s) are in group "${group.name}"`);

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
        console.error(`\n❌ SECURITY ERROR: User ${userName} (${userIdString}) is NOT in group "${group.name}" - SKIPPING`);
        return Promise.resolve(null);
      }

      console.log(`\n📱 Sending notification to: ${userName} (${userIdString}) - ${isParticipant ? 'Participant' : 'Creator'}`);

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
        console.log(`✅ Notification sent to: ${userName} (verified as ${isParticipant ? 'participant' : 'creator'})`);
      }).catch((error) => {
        console.error(`❌ Error sending notification to ${userName} (${userIdString}):`, error.message || error);
        return null;
      });
    });

    await Promise.all(notificationPromises);

    console.log(`\n✅ Successfully sent collection notifications for group: ${group.name}`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

// Get group name from command line
const groupName = process.argv[2];

if (!groupName) {
  console.log('Usage: node send-notification-to-group.js <groupName>');
  console.log('Example: node send-notification-to-group.js "Ramazan Savings"');
  process.exit(1);
}

sendNotificationToGroup(groupName);
