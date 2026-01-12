const cron = require('node-cron');
const Group = require('../models/Group');
const User = require('../models/User');
const notificationService = require('./notificationService');

/**
 * Check for groups that need collection notifications and send them
 * This runs daily to check if any groups have their collection date today
 * Supports both MONTHLY (day of month 1-31) and WEEKLY (day of week 1-7) frequencies
 */
async function checkAndSendCollectionNotifications() {
  try {
    console.log('[SCHEDULER] Checking for groups that need collection notifications...');
    
    const today = new Date();
    const todayDate = today.getDate(); // Day of month (1-31)
    const todayDayOfWeek = today.getDay(); // Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const currentMonth = today.getMonth(); // Month (0-11)
    const currentYear = today.getFullYear();
    
    // Convert JavaScript day of week (0-6) to our format (1-7 where 1=Monday, 7=Sunday)
    // JavaScript: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
    // Our format: 1=Monday, 2=Tuesday, ..., 7=Sunday
    const todayDayOfWeekFormatted = todayDayOfWeek === 0 ? 7 : todayDayOfWeek; // Sunday = 7

    // Find all active groups with MONTHLY frequency and collection date matching today
    const monthlyGroups = await Group.find({
      status: 'ACTIVE',
      frequency: 'MONTHLY',
      collectionDate: todayDate,
      amountPerPerson: { $exists: true, $gt: 0 },
    }).populate('createdBy', 'name email').populate('participants.user', 'name email');

    // Find all active groups with WEEKLY frequency and collection date (day of week) matching today
    const weeklyGroups = await Group.find({
      status: 'ACTIVE',
      frequency: 'WEEKLY',
      collectionDate: todayDayOfWeekFormatted,
      amountPerPerson: { $exists: true, $gt: 0 },
    }).populate('createdBy', 'name email').populate('participants.user', 'name email');

    const groupsToNotify = [...monthlyGroups, ...weeklyGroups];

    console.log(`[SCHEDULER] Found ${monthlyGroups.length} MONTHLY group(s) with collection date today (${todayDate})`);
    console.log(`[SCHEDULER] Found ${weeklyGroups.length} WEEKLY group(s) with collection day today (${todayDayOfWeekFormatted} = ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][todayDayOfWeek]})`);
    console.log(`[SCHEDULER] Total groups to notify: ${groupsToNotify.length}`);

    for (const group of groupsToNotify) {
      try {
        // Check if we already sent a notification (prevent duplicates)
        if (group.lastCollectionNotificationSent) {
          const lastSent = new Date(group.lastCollectionNotificationSent);
          
          if (group.frequency === 'MONTHLY') {
            // For MONTHLY: Skip if already sent this month
            const lastSentMonth = lastSent.getMonth();
            const lastSentYear = lastSent.getFullYear();
            
            if (lastSentMonth === currentMonth && lastSentYear === currentYear) {
              console.log(`[SCHEDULER] Skipping ${group.name} (MONTHLY) - notification already sent this month`);
              continue;
            }
          } else if (group.frequency === 'WEEKLY') {
            // For WEEKLY: Skip if already sent this week (within last 7 days)
            const daysSinceLastSent = Math.floor((today - lastSent) / (1000 * 60 * 60 * 24));
            
            if (daysSinceLastSent < 7) {
              console.log(`[SCHEDULER] Skipping ${group.name} (WEEKLY) - notification already sent ${daysSinceLastSent} day(s) ago`);
              continue;
            }
          }
        }

        // Get ONLY participants who are in this specific group (not all app users)
        // IMPORTANT: Only send to users who are ACTUALLY participants in this group
        const participantUserIds = [];
        const participantNames = [];
        const userIdsSet = new Set(); // Use Set to prevent duplicates
        
        // Only include participants who have userId (registered users in this group)
        group.participants.forEach((participant) => {
          if (participant.user) {
            // Handle both ObjectId and populated user object
            const userId = participant.user._id ? participant.user._id : participant.user;
            const userIdString = userId.toString();
            
            // Only add if not already added (prevent duplicates)
            if (!userIdsSet.has(userIdString)) {
              const userName = participant.user.name || participant.user.email || participant.name || 'Unknown';
              participantUserIds.push(userId);
              participantNames.push(userName);
              userIdsSet.add(userIdString);
              console.log(`[SCHEDULER]   ✅ Participant in group: ${userName} (userId: ${userIdString})`);
            }
          }
        });

        // Also include the group creator ONLY if they are not already in participants list
        const creatorId = group.createdBy._id ? group.createdBy._id : group.createdBy;
        const creatorIdString = creatorId ? creatorId.toString() : null;
        const creatorName = group.createdBy.name || group.createdBy.email || 'Group Creator';
        
        if (creatorIdString && !userIdsSet.has(creatorIdString)) {
          // Double-check: creator should only be notified if they're actually managing this group
          // Only add creator if they're not already a participant
          const isCreatorInParticipants = group.participants.some((p) => {
            if (!p.user) return false;
            const pUserId = p.user._id ? p.user._id : p.user;
            return pUserId.toString() === creatorIdString;
          });
          
          if (!isCreatorInParticipants) {
            participantUserIds.push(creatorId);
            participantNames.push(creatorName);
            userIdsSet.add(creatorIdString);
            console.log(`[SCHEDULER]   ✅ Group Creator (not a participant): ${creatorName} (userId: ${creatorIdString})`);
          } else {
            console.log(`[SCHEDULER]   ℹ️  Group Creator is already a participant, skipping duplicate`);
          }
        }

        if (participantUserIds.length === 0) {
          console.log(`[SCHEDULER] ⚠️  Skipping ${group.name} - no registered users in this group to notify`);
          continue;
        }

        // Prepare notification message
        const frequencyText = group.frequency === 'WEEKLY' ? 'week' : 'month';
        const title = `💰 Collection Reminder: ${group.name}`;
        const body = `It's collection day! Please contribute $${group.amountPerPerson} for ${group.name} (${frequencyText}ly).`;

        console.log(`[SCHEDULER] 📤 Sending collection notification for group: ${group.name} (${group.frequency})`);
        console.log(`[SCHEDULER] 👥 Notifying ONLY ${participantUserIds.length} user(s) in this group:`);
        participantNames.forEach((name, index) => {
          console.log(`[SCHEDULER]   ${index + 1}. ${name}`);
        });

        // Send notifications ONLY to participants in this group
        // SECURITY: Final verification before sending - ensure user is actually in this group
        console.log(`[SCHEDULER] 🔒 Security Check: Verifying all ${participantUserIds.length} user(s) are in group "${group.name}"`);
        
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
            console.error(`[SCHEDULER] ❌ SECURITY ERROR: User ${userName} (${userIdString}) is NOT in group "${group.name}" - SKIPPING`);
            return Promise.resolve(null);
          }
          
          console.log(`[SCHEDULER] 📱 Sending notification to: ${userName} (${userIdString}) - ${isParticipant ? 'Participant' : 'Creator'}`);
          
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
            console.log(`[SCHEDULER] ✅ Notification sent to: ${userName} (verified as ${isParticipant ? 'participant' : 'creator'})`);
          }).catch((error) => {
            console.error(`[SCHEDULER] ❌ Error sending notification to ${userName} (${userIdString}):`, error.message || error);
            return null;
          });
        });

        await Promise.all(notificationPromises);

        // Update last notification sent date
        group.lastCollectionNotificationSent = today;
        await group.save();

        console.log(`[SCHEDULER] ✅ Successfully sent collection notifications for group: ${group.name}`);
      } catch (groupError) {
        console.error(`[SCHEDULER] Error processing group ${group.name}:`, groupError);
      }
    }

    console.log(`[SCHEDULER] Completed checking collection notifications`);
  } catch (error) {
    console.error('[SCHEDULER] Error in collection notification check:', error);
  }
}

/**
 * Initialize the scheduler
 * Runs daily at 9:00 AM to check for collection dates
 */
function initializeScheduler() {
  // Run daily at 9:00 AM
  // Cron format: minute hour day month dayOfWeek
  // '0 9 * * *' = At 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    console.log('[SCHEDULER] Daily collection notification check started');
    await checkAndSendCollectionNotifications();
  });

  // Also run immediately on startup (for testing)
  // Comment this out in production if you don't want immediate execution
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SCHEDULER] Running initial collection notification check...');
    checkAndSendCollectionNotifications().catch(console.error);
  }

  console.log('[SCHEDULER] ✅ Collection notification scheduler initialized');
  console.log('[SCHEDULER] Will check daily at 9:00 AM for groups with collection dates');
}

module.exports = {
  initializeScheduler,
  checkAndSendCollectionNotifications,
};
