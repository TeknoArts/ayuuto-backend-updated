require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');

/**
 * Diagnostic script to check which groups a user is in
 * Usage: node check-user-groups.js <userEmail>
 */

async function checkUserGroups(userEmail) {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto');
    console.log('✅ Connected to MongoDB\n');

    // Find user by email
    const user = await User.findOne({ email: userEmail.toLowerCase().trim() });
    
    if (!user) {
      console.log(`❌ User not found: ${userEmail}`);
      await mongoose.connection.close();
      return;
    }

    console.log(`👤 User found: ${user.name || user.email}`);
    console.log(`   User ID: ${user._id}\n`);

    // Find all groups where user is a participant
    const groupsAsParticipant = await Group.find({
      'participants.user': user._id,
    }).populate('createdBy', 'name email').populate('participants.user', 'name email');

    // Find all groups created by user
    const groupsAsCreator = await Group.find({
      createdBy: user._id,
    }).populate('createdBy', 'name email').populate('participants.user', 'name email');

    // Combine and deduplicate
    const allGroupIds = new Set();
    const allGroups = [];

    groupsAsParticipant.forEach(g => {
      if (!allGroupIds.has(g._id.toString())) {
        allGroupIds.add(g._id.toString());
        allGroups.push({ group: g, role: 'participant' });
      }
    });

    groupsAsCreator.forEach(g => {
      if (!allGroupIds.has(g._id.toString())) {
        allGroupIds.add(g._id.toString());
        allGroups.push({ group: g, role: 'creator' });
      } else {
        // Update role if user is both creator and participant
        const existing = allGroups.find(item => item.group._id.toString() === g._id.toString());
        if (existing) {
          existing.role = 'creator & participant';
        }
      }
    });

    console.log(`📊 Groups Summary:`);
    console.log(`   Total groups: ${allGroups.length}`);
    console.log(`   As participant: ${groupsAsParticipant.length}`);
    console.log(`   As creator: ${groupsAsCreator.length}\n`);

    if (allGroups.length === 0) {
      console.log('ℹ️  User is not in any groups\n');
    } else {
      console.log('📋 Group Details:\n');
      allGroups.forEach(({ group, role }, index) => {
        console.log(`${index + 1}. ${group.name}`);
        console.log(`   Role: ${role}`);
        console.log(`   Status: ${group.status}`);
        console.log(`   Frequency: ${group.frequency || 'N/A'}`);
        console.log(`   Collection Date: ${group.collectionDate || 'N/A'}`);
        console.log(`   Amount Per Person: $${group.amountPerPerson || 0}`);
        console.log(`   Total Participants: ${group.participants.length}`);
        
        // Show all participants
        console.log(`   Participants:`);
        group.participants.forEach((p, idx) => {
          const pUserId = p.user?._id ? p.user._id : p.user;
          const isCurrentUser = pUserId && pUserId.toString() === user._id.toString();
          const pName = p.user?.name || p.user?.email || p.name || 'Unknown';
          console.log(`      ${idx + 1}. ${pName} ${isCurrentUser ? '← YOU' : ''} (userId: ${pUserId || 'N/A'})`);
        });
        
        // Show creator
        const creatorId = group.createdBy._id ? group.createdBy._id : group.createdBy;
        const creatorName = group.createdBy.name || group.createdBy.email || 'Unknown';
        const isCreator = creatorId.toString() === user._id.toString();
        console.log(`   Creator: ${creatorName} ${isCreator ? '← YOU' : ''} (userId: ${creatorId})`);
        
        console.log('');
      });
    }

    // Check for MONTHLY groups with collection dates
    const monthlyGroups = allGroups.filter(({ group }) => 
      group.frequency === 'MONTHLY' && group.collectionDate && group.status === 'ACTIVE'
    );

    if (monthlyGroups.length > 0) {
      const today = new Date().getDate();
      console.log(`\n🔔 Monthly Collection Groups:`);
      monthlyGroups.forEach(({ group }) => {
        const willNotify = group.collectionDate === today;
        console.log(`   - ${group.name}: Collection date = ${group.collectionDate} ${willNotify ? '← TODAY (will notify)' : ''}`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Check completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

// Get email from command line
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node check-user-groups.js <userEmail>');
  console.log('Example: node check-user-groups.js user@example.com');
  process.exit(1);
}

checkUserGroups(userEmail);
