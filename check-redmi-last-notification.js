/**
 * Check last notification sent to Redmi Note 9S (Momina's device)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./app/models/Notification');
const User = require('./app/models/User');
const Group = require('./app/models/Group');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function checkRedmiLastNotification() {
  try {
    console.log('🔍 Checking last notification for Redmi Note 9S (Momina\'s device)...\n');
    
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log('✅ Connected to MongoDB\n');

    // Find Momina by device ID
    const momina = await User.findOne({
      'pushTokens.deviceId': 'Redmi Note 9S'
    }).select('name email pushTokens _id');

    if (!momina) {
      console.log('❌ No user found with device "Redmi Note 9S"');
      // Try finding by name
      const mominaByName = await User.findOne({
        $or: [
          { name: { $regex: /momina/i } },
          { email: { $regex: /momina/i } }
        ]
      });
      
      if (mominaByName) {
        console.log(`✅ Found user by name: ${mominaByName.name} (${mominaByName.email})`);
        console.log(`   User ID: ${mominaByName._id}\n`);
        
        // Get notifications for this user
        const notifications = await Notification.find({
          user: mominaByName._id
        }).sort({ createdAt: -1 }).limit(10);

        console.log(`📋 Last ${notifications.length} notification(s) for ${mominaByName.name}:\n`);

        if (notifications.length === 0) {
          console.log('   ❌ No notifications found in database\n');
        } else {
          notifications.forEach((notif, index) => {
            console.log(`${index + 1}. ${notif.title || 'No Title'}`);
            console.log(`   Body: ${notif.body || 'No Body'}`);
            console.log(`   Type: ${notif.type || 'N/A'}`);
            console.log(`   Group ID: ${notif.data?.groupId || 'N/A'}`);
            console.log(`   Group Name: ${notif.data?.groupName || 'N/A'}`);
            console.log(`   Collection Date: ${notif.data?.collectionDate || 'N/A'}`);
            console.log(`   Amount: ${notif.data?.amountPerPerson ? '$' + notif.data.amountPerPerson : 'N/A'}`);
            console.log(`   Created: ${new Date(notif.createdAt).toLocaleString()}`);
            console.log(`   Time Ago: ${getTimeAgo(notif.createdAt)}`);
            console.log('');
          });

          // Check the most recent one
          const lastNotification = notifications[0];
          console.log(`\n📱 MOST RECENT NOTIFICATION:\n`);
          console.log(`   Title: ${lastNotification.title}`);
          console.log(`   Body: ${lastNotification.body}`);
          console.log(`   Type: ${lastNotification.type || 'N/A'}`);
          console.log(`   Group: ${lastNotification.data?.groupName || 'N/A'}`);
          console.log(`   Sent: ${new Date(lastNotification.createdAt).toLocaleString()}`);
          console.log(`   ${getTimeAgo(lastNotification.createdAt)} ago\n`);

          // Check if it's a collection reminder
          if (lastNotification.type === 'collection_reminder' || lastNotification.data?.type === 'collection_reminder') {
            const groupId = lastNotification.data?.groupId;
            if (groupId) {
              const group = await Group.findById(groupId)
                .populate('participants.user', 'name email');
              
              if (group) {
                const isParticipant = group.participants.some(p => {
                  if (!p.user) return false;
                  const pUserId = p.user._id ? p.user._id : p.user;
                  return pUserId.toString() === mominaByName._id.toString();
                });
                
                console.log(`   🔍 Group Details:`);
                console.log(`      Name: ${group.name}`);
                console.log(`      Collection Date: ${group.collectionDate}`);
                console.log(`      Frequency: ${group.frequency}`);
                console.log(`      Momina is Participant: ${isParticipant ? '✅ YES' : '❌ NO'}`);
                console.log(`      Participants: ${group.participants.length}`);
                console.log('');
              }
            }
          }
        }
      }
      
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found user: ${momina.name} (${momina.email})`);
    console.log(`   User ID: ${momina._id}`);
    console.log(`   Device: Redmi Note 9S\n`);

    // Get notifications for this user
    const notifications = await Notification.find({
      user: momina._id
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`📋 Last ${notifications.length} notification(s) for ${momina.name}:\n`);

    if (notifications.length === 0) {
      console.log('   ❌ No notifications found in database');
      console.log('   This means no notifications were sent to Momina through our system\n');
    } else {
      notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title || 'No Title'}`);
        console.log(`   Body: ${notif.body || 'No Body'}`);
        console.log(`   Type: ${notif.type || 'N/A'}`);
        console.log(`   Group ID: ${notif.data?.groupId || 'N/A'}`);
        console.log(`   Group Name: ${notif.data?.groupName || 'N/A'}`);
        console.log(`   Collection Date: ${notif.data?.collectionDate || 'N/A'}`);
        console.log(`   Amount: ${notif.data?.amountPerPerson ? '$' + notif.data.amountPerPerson : 'N/A'}`);
        console.log(`   Created: ${new Date(notif.createdAt).toLocaleString()}`);
        console.log(`   Time Ago: ${getTimeAgo(notif.createdAt)}`);
        console.log('');
      });

      // Check the most recent one
      const lastNotification = notifications[0];
      console.log(`\n📱 MOST RECENT NOTIFICATION:\n`);
      console.log(`   Title: ${lastNotification.title}`);
      console.log(`   Body: ${lastNotification.body}`);
      console.log(`   Type: ${lastNotification.type || 'N/A'}`);
      console.log(`   Group: ${lastNotification.data?.groupName || 'N/A'}`);
      console.log(`   Sent: ${new Date(lastNotification.createdAt).toLocaleString()}`);
      console.log(`   ${getTimeAgo(lastNotification.createdAt)} ago\n`);

      // Check if it's a collection reminder
      if (lastNotification.type === 'collection_reminder' || lastNotification.data?.type === 'collection_reminder') {
        const groupId = lastNotification.data?.groupId;
        if (groupId) {
          const group = await Group.findById(groupId)
            .populate('participants.user', 'name email');
          
          if (group) {
            const isParticipant = group.participants.some(p => {
              if (!p.user) return false;
              const pUserId = p.user._id ? p.user._id : p.user;
              return pUserId.toString() === momina._id.toString();
            });
            
            console.log(`   🔍 Group Details:`);
            console.log(`      Name: ${group.name}`);
            console.log(`      Collection Date: ${group.collectionDate}`);
            console.log(`      Frequency: ${group.frequency}`);
            console.log(`      Momina is Participant: ${isParticipant ? '✅ YES' : '❌ NO'}`);
            console.log(`      Participants: ${group.participants.length}`);
            console.log('');
          }
        }
      }
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

function getTimeAgo(date) {
  if (!date) return 'Unknown';
  const now = new Date();
  const then = new Date(date);
  const diffInMs = now.getTime() - then.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'}`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'}`;
  return `${diffInDays} day${diffInDays === 1 ? '' : 's'}`;
}

checkRedmiLastNotification();
