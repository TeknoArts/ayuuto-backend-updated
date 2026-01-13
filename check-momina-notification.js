/**
 * Check why Momina received a notification
 * Run with: node check-momina-notification.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function checkMominaNotification() {
  try {
    console.log('🔍 Investigating why Momina received a notification...\n');
    
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find Momina user
    const mominaUser = await User.findOne({
      $or: [
        { name: { $regex: /momina/i } },
        { email: { $regex: /momina/i } }
      ]
    });

    if (!mominaUser) {
      console.log('❌ User "Momina" not found in database');
      console.log('\n📋 Searching for similar names...');
      const similarUsers = await User.find({
        $or: [
          { name: { $regex: /m/i } },
        ]
      }).select('name email _id').limit(10);
      
      if (similarUsers.length > 0) {
        console.log('\nFound users with similar names:');
        similarUsers.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.name} (${u.email}) - ID: ${u._id}`);
        });
      }
      
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found user: ${mominaUser.name}`);
    console.log(`   Email: ${mominaUser.email}`);
    console.log(`   User ID: ${mominaUser._id}\n`);

    // Find the group with collection date 14
    const groupWithDate14 = await Group.findOne({
      collectionDate: 14,
      frequency: 'MONTHLY',
    })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    if (!groupWithDate14) {
      console.log('❌ No group found with collection date 14');
      await mongoose.connection.close();
      return;
    }

    console.log(`📋 Group with collection date 14: ${groupWithDate14.name}`);
    console.log(`   Group ID: ${groupWithDate14._id}`);
    console.log(`   Created By: ${groupWithDate14.createdBy?.name || 'Unknown'}\n`);

    // Check if Momina is a participant in this group
    const mominaIsParticipant = groupWithDate14.participants.some((p) => {
      if (!p.user) return false;
      const pUserId = p.user._id ? p.user._id : p.user;
      return pUserId.toString() === mominaUser._id.toString();
    });

    // Check if Momina is the creator
    const mominaIsCreator = groupWithDate14.createdBy && 
      (groupWithDate14.createdBy._id ? groupWithDate14.createdBy._id : groupWithDate14.createdBy).toString() === mominaUser._id.toString();

    console.log(`🔍 Checking Momina's relationship to this group:\n`);
    console.log(`   Is Participant: ${mominaIsParticipant ? '✅ YES' : '❌ NO'}`);
    console.log(`   Is Creator: ${mominaIsCreator ? '✅ YES' : '❌ NO'}`);
    console.log(`   Should Receive Notification: ${(mominaIsParticipant || mominaIsCreator) ? '✅ YES' : '❌ NO'}\n`);

    // List all participants
    console.log(`📋 All participants in this group:\n`);
    groupWithDate14.participants.forEach((p, index) => {
      const pUserId = p.user ? (p.user._id ? p.user._id : p.user) : null;
      const pUserIdString = pUserId ? pUserId.toString() : 'No userId';
      const pUserName = p.user ? (p.user.name || p.user.email || p.name) : p.name;
      const isMomina = pUserIdString === mominaUser._id.toString();
      
      console.log(`   ${index + 1}. ${pUserName}`);
      console.log(`      User ID: ${pUserIdString}`);
      console.log(`      Is Momina: ${isMomina ? '✅ YES' : '❌ NO'}`);
      console.log(`      Has userId: ${p.user ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });

    // Check if Momina is in any other groups with collection date 14
    console.log(`\n🔍 Checking if Momina is in ANY groups with collection date 14:\n`);
    const allGroupsWithDate14 = await Group.find({
      collectionDate: 14,
    })
      .populate('createdBy', 'name email')
      .populate('participants.user', 'name email');

    let mominaInOtherGroups = [];
    allGroupsWithDate14.forEach((group) => {
      const isParticipant = group.participants.some((p) => {
        if (!p.user) return false;
        const pUserId = p.user._id ? p.user._id : p.user;
        return pUserId.toString() === mominaUser._id.toString();
      });
      const isCreator = group.createdBy && 
        (group.createdBy._id ? group.createdBy._id : group.createdBy).toString() === mominaUser._id.toString();
      
      if (isParticipant || isCreator) {
        mominaInOtherGroups.push({
          group: group.name,
          groupId: group._id.toString(),
          isParticipant,
          isCreator,
        });
      }
    });

    if (mominaInOtherGroups.length > 0) {
      console.log(`⚠️  Momina is in ${mominaInOtherGroups.length} other group(s) with collection date 14:\n`);
      mominaInOtherGroups.forEach((g, i) => {
        console.log(`   ${i + 1}. ${g.group}`);
        console.log(`      Group ID: ${g.groupId}`);
        console.log(`      Is Participant: ${g.isParticipant ? '✅ YES' : '❌ NO'}`);
        console.log(`      Is Creator: ${g.isCreator ? '✅ YES' : '❌ NO'}`);
        console.log('');
      });
    } else {
      console.log(`✅ Momina is NOT in any other groups with collection date 14\n`);
    }

    // Final conclusion
    console.log(`\n📊 CONCLUSION:\n`);
    if (mominaIsParticipant || mominaIsCreator) {
      console.log(`✅ Momina SHOULD receive notification because:`);
      if (mominaIsParticipant) console.log(`   - Momina is a participant in the group "${groupWithDate14.name}"`);
      if (mominaIsCreator) console.log(`   - Momina is the creator of the group "${groupWithDate14.name}"`);
    } else {
      console.log(`❌ Momina SHOULD NOT receive notification because:`);
      console.log(`   - Momina is NOT a participant in the group "${groupWithDate14.name}"`);
      console.log(`   - Momina is NOT the creator of the group "${groupWithDate14.name}"`);
      console.log(`\n⚠️  SECURITY ISSUE: If Momina received a notification, there may be a bug in the notification system!`);
    }

    await mongoose.connection.close();
    console.log('\n📡 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkMominaNotification();
