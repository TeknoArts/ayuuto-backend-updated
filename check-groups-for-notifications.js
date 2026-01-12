/**
 * Check existing groups and see which ones are eligible for notifications
 * Run with: node check-groups-for-notifications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
require('./app/models/User'); // Register User model for population

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function checkGroups() {
  try {
    console.log('🔍 Checking Groups for Notification Eligibility...\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log('✅ Connected to MongoDB\n');

    const today = new Date();
    const todayDate = today.getDate();
    console.log(`📅 Today's date: ${todayDate}\n`);

    // Get all groups
    const allGroups = await Group.find({}).populate('createdBy', 'name email');
    console.log(`📊 Total groups in database: ${allGroups.length}\n`);

    if (allGroups.length === 0) {
      console.log('⚠️  No groups found in database.');
      console.log('   Create a group first to test notifications.\n');
      await mongoose.connection.close();
      return;
    }

    // Check each group
    console.log('📋 Group Details:\n');
    allGroups.forEach((group, index) => {
      console.log(`Group ${index + 1}: ${group.name}`);
      console.log(`   Status: ${group.status}`);
      console.log(`   Frequency: ${group.frequency || 'NOT SET'}`);
      console.log(`   Collection Date: ${group.collectionDate || 'NOT SET'}`);
      console.log(`   Amount Per Person: ${group.amountPerPerson || 'NOT SET'}`);
      console.log(`   Collection Date Matches Today: ${group.collectionDate === todayDate ? '✅ YES' : '❌ NO'}`);
      
      // Check eligibility
      const isEligible = 
        group.status === 'ACTIVE' &&
        group.frequency === 'MONTHLY' &&
        group.collectionDate === todayDate &&
        group.amountPerPerson > 0;
      
      console.log(`   Eligible for Notification: ${isEligible ? '✅ YES' : '❌ NO'}`);
      
      if (!isEligible) {
        const reasons = [];
        if (group.status !== 'ACTIVE') reasons.push(`Status is ${group.status} (needs ACTIVE)`);
        if (group.frequency !== 'MONTHLY') reasons.push(`Frequency is ${group.frequency || 'NOT SET'} (needs MONTHLY)`);
        if (group.collectionDate !== todayDate) reasons.push(`Collection date is ${group.collectionDate || 'NOT SET'} (today is ${todayDate})`);
        if (!group.amountPerPerson || group.amountPerPerson <= 0) reasons.push(`Amount not set or invalid`);
        console.log(`   Reasons: ${reasons.join(', ')}`);
      }
      
      console.log(`   Participants: ${group.participants.length}`);
      const registeredParticipants = group.participants.filter(p => p.user).length;
      console.log(`   Registered Users: ${registeredParticipants}`);
      console.log('');
    });

    // Find eligible groups
    const eligibleGroups = allGroups.filter(g => 
      g.status === 'ACTIVE' &&
      g.frequency === 'MONTHLY' &&
      g.collectionDate === todayDate &&
      g.amountPerPerson > 0
    );

    console.log(`\n✅ Groups eligible for notification today: ${eligibleGroups.length}`);
    
    if (eligibleGroups.length === 0) {
      console.log('\n💡 To test notifications:');
      console.log(`   1. Create/update a group with:`);
      console.log(`      - Status: ACTIVE`);
      console.log(`      - Frequency: MONTHLY`);
      console.log(`      - Collection Date: ${todayDate} (today's date)`);
      console.log(`      - Amount Per Person: > 0`);
      console.log(`   2. Add participants with userId (registered users)`);
      console.log(`   3. Run: node test-collection-notifications.js`);
    } else {
      console.log('\n✅ Ready to test! Run: node test-collection-notifications.js');
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkGroups();
