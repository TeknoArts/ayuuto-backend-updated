/**
 * Test script to check and send notifications for groups with collection date matching TODAY
 * Run with: node test-today-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');
const notificationService = require('./app/services/notificationService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function testTodayNotifications() {
  try {
    console.log('🧪 Testing Notifications for Groups with Collection Date Matching TODAY...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get today's date
    const today = new Date();
    const todayDate = today.getDate(); // Day of month (1-31)
    const todayDayOfWeek = today.getDay(); // Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const todayDayOfWeekFormatted = todayDayOfWeek === 0 ? 7 : todayDayOfWeek; // Sunday = 7
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    console.log(`📅 Today's Date: ${today.toLocaleDateString()}`);
    console.log(`📅 Day of Month: ${todayDate}`);
    console.log(`📅 Day of Week: ${dayNames[todayDayOfWeek]} (${todayDayOfWeekFormatted} in our format)\n`);

    // Find all groups with collection date matching today (for MONTHLY)
    console.log(`🔍 Searching for MONTHLY groups with collection date: ${todayDate}...\n`);
    
    const monthlyGroups = await Group.find({
      collectionDate: todayDate,
      frequency: 'MONTHLY',
    })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    // Find all groups with collection day matching today (for WEEKLY)
    console.log(`🔍 Searching for WEEKLY groups with collection day: ${todayDayOfWeekFormatted} (${dayNames[todayDayOfWeek]})...\n`);
    
    const weeklyGroups = await Group.find({
      collectionDate: todayDayOfWeekFormatted,
      frequency: 'WEEKLY',
    })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    const allGroups = [...monthlyGroups, ...weeklyGroups];

    console.log(`📋 Found ${monthlyGroups.length} MONTHLY group(s) with collection date ${todayDate}`);
    console.log(`📋 Found ${weeklyGroups.length} WEEKLY group(s) with collection day ${todayDayOfWeekFormatted}`);
    console.log(`📋 Total groups found: ${allGroups.length}\n`);

    if (allGroups.length === 0) {
      console.log('❌ No groups found with collection date/day matching today');
      console.log('\n💡 To test:');
      console.log(`   1. Create a group with MONTHLY frequency and set collection date to ${todayDate}`);
      console.log(`   OR create a group with WEEKLY frequency and set collection day to ${todayDayOfWeekFormatted} (${dayNames[todayDayOfWeek]})`);
      console.log('   2. Add participants with registered users');
      console.log('   3. Run this script again\n');
      await mongoose.connection.close();
      return;
    }

    // Display all groups found
    allGroups.forEach((group, index) => {
      console.log(`Group ${index + 1}: ${group.name}`);
      console.log(`   Status: ${group.status}`);
      console.log(`   Frequency: ${group.frequency || 'NOT SET'}`);
      console.log(`   Collection Date/Day: ${group.collectionDate}`);
      console.log(`   Amount Per Person: $${group.amountPerPerson || 0}`);
      console.log(`   Participants: ${group.participants.length}`);
      const registeredParticipants = group.participants.filter(p => p.user).length;
      console.log(`   Registered Users: ${registeredParticipants}`);
      console.log('');
    });

    // Filter eligible groups (ACTIVE, has amount, has registered users)
    const eligibleGroups = allGroups.filter(group => {
      const hasRegisteredUsers = group.participants.some(p => p.user);
      return (
        group.status === 'ACTIVE' &&
        group.amountPerPerson > 0 &&
        hasRegisteredUsers
      );
    });

    console.log(`\n✅ Eligible groups for notification: ${eligibleGroups.length}\n`);

    if (eligibleGroups.length === 0) {
      console.log('⚠️  No eligible groups found. Groups must be:');
      console.log('   - Status: ACTIVE');
      console.log('   - Amount Per Person: > 0');
      console.log('   - Have at least one registered user participant\n');
      await mongoose.connection.close();
      return;
    }

    // Process each eligible group
    for (const group of eligibleGroups) {
      try {
        console.log(`\n📤 Processing group: ${group.name}`);
        console.log(`   Collection Date/Day: ${group.collectionDate}`);
        console.log(`   Frequency: ${group.frequency}`);
        console.log(`   Amount: $${group.amountPerPerson}\n`);

        // Reset lastCollectionNotificationSent to allow testing
        console.log('   🔄 Resetting lastCollectionNotificationSent for testing...');
        group.lastCollectionNotificationSent = null;
        await group.save();

        // Get ONLY participants who are in this specific group
        const participantUserIds = [];
        const participantNames = [];
        const userIdsSet = new Set();

        console.log(`   🔒 SECURITY: Collecting ONLY participants from group "${group.name}"`);
        console.log(`   🔒 Total participants in this group: ${group.participants.length}`);

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
              console.log(`   ✅ Participant in THIS group only: ${userName} (userId: ${userIdString})`);
            }
          } else {
            console.log(`   ⚠️  Participant "${participant.name}" has no userId - skipping (not a registered user)`);
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

        console.log(`   🔒 SECURITY: Found ${participantUserIds.length} registered user(s) who are participants of THIS group only`);

        if (participantUserIds.length === 0) {
          console.log(`   ⚠️  No registered users in this group to notify`);
          continue;
        }

        // Prepare notification message
        const frequencyText = group.frequency === 'WEEKLY' ? 'week' : 'month';
        const title = `💰 Collection Reminder: ${group.name}`;
        const body = `It's collection day! Please contribute $${group.amountPerPerson} for ${group.name} (${frequencyText}ly).`;

        console.log(`\n   📤 Sending notifications to ${participantUserIds.length} user(s) in THIS group only:`);
        console.log(`   🔒 IMPORTANT: We are NOT sending to all app users - ONLY to participants of this group`);

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
            console.log(`   ✅ Notification sent to: ${userName} (verified as ${isParticipant ? 'participant' : 'creator'} of THIS group)`);
          }).catch((error) => {
            console.error(`   ❌ Error sending to ${userName}:`, error.message || error);
            return null;
          });
        });

        await Promise.all(notificationPromises);

        // Update last notification sent date
        group.lastCollectionNotificationSent = new Date();
        await group.save();

        console.log(`   ✅ Successfully sent notifications for group: ${group.name}`);
        console.log(`   🔒 SECURITY CONFIRMED: Notifications sent ONLY to ${participantUserIds.length} participant(s) of THIS group`);
        console.log(`   🔒 SECURITY CONFIRMED: NO notifications were sent to users outside this group\n`);
      } catch (groupError) {
        console.error(`   ❌ Error processing group ${group.name}:`, groupError);
      }
    }

    console.log('\n✅ Test completed!');
    console.log('\n📋 Summary:');
    console.log(`   - Today's date: ${todayDate} (for MONTHLY) / ${todayDayOfWeekFormatted} (${dayNames[todayDayOfWeek]} for WEEKLY)`);
    console.log(`   - Total groups found: ${allGroups.length}`);
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

testTodayNotifications();
