/**
 * Check Momina's notification history to see what notifications she received
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Notification = require('./app/models/Notification');
const User = require('./app/models/User');
const Group = require('./app/models/Group');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function checkMominaNotifications() {
  try {
    console.log('🔍 Checking Momina\'s notification history...\n');
    
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log('✅ Connected to MongoDB\n');

    // Find Momina
    const momina = await User.findOne({
      $or: [
        { name: { $regex: /momina/i } },
        { email: { $regex: /momina/i } }
      ]
    });

    if (!momina) {
      console.log('❌ Momina not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found: ${momina.name} (${momina.email})`);
    console.log(`   User ID: ${momina._id}\n`);

    // Get all notifications for Momina
    const notifications = await Notification.find({
      user: momina._id
    }).sort({ createdAt: -1 }).limit(20);

    console.log(`📋 Momina's Recent Notifications (${notifications.length}):\n`);

    if (notifications.length === 0) {
      console.log('   No notifications found for Momina\n');
    } else {
      notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ${notif.title}`);
        console.log(`   Body: ${notif.body}`);
        console.log(`   Type: ${notif.type || 'N/A'}`);
        console.log(`   Group ID: ${notif.data?.groupId || 'N/A'}`);
        console.log(`   Group Name: ${notif.data?.groupName || 'N/A'}`);
        console.log(`   Created: ${new Date(notif.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    // Check if any notifications are for collection reminders
    const collectionNotifications = notifications.filter(n => 
      n.type === 'collection_reminder' || 
      n.data?.type === 'collection_reminder'
    );

    if (collectionNotifications.length > 0) {
      console.log(`\n⚠️  Found ${collectionNotifications.length} collection reminder notification(s) for Momina:\n`);
      
      for (const notif of collectionNotifications) {
        const groupId = notif.data?.groupId;
        if (groupId) {
          const group = await Group.findById(groupId)
            .populate('participants.user', 'name email');
          
          if (group) {
            const isParticipant = group.participants.some(p => {
              if (!p.user) return false;
              const pUserId = p.user._id ? p.user._id : p.user;
              return pUserId.toString() === momina._id.toString();
            });
            
            console.log(`   Group: ${group.name}`);
            console.log(`   Collection Date: ${group.collectionDate}`);
            console.log(`   Momina is Participant: ${isParticipant ? '✅ YES' : '❌ NO'}`);
            console.log(`   Notification Time: ${new Date(notif.createdAt).toLocaleString()}`);
            console.log('');
          }
        }
      }
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkMominaNotifications();
