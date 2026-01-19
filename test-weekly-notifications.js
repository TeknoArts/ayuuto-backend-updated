require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');
const { checkAndSendCollectionNotifications } = require('./app/services/schedulerService');

/**
 * Test script for weekly collection notifications
 * Creates/updates a test group and sends notifications
 */

async function testWeeklyNotifications() {
  try {
    console.log('🧪 Testing Weekly Collection Notifications...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto');
    console.log('✅ Connected to MongoDB\n');

    // Get today's day of week
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const todayDayOfWeekFormatted = dayOfWeek === 0 ? 7 : dayOfWeek; // Our format: 1=Monday, 7=Sunday
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    console.log(`📅 Today: ${dayNames[dayOfWeek]}`);
    console.log(`📅 Day of week (our format): ${todayDayOfWeekFormatted}\n`);

    // Find or create a test weekly group
    let testGroup = await Group.findOne({ 
      name: 'Test Weekly Group',
      frequency: 'WEEKLY'
    }).populate('participants.user', 'name email').populate('createdBy', 'name email');

    if (!testGroup) {
      console.log('📋 Creating test weekly group...');
      
      // Find a user to be the creator
      const creator = await User.findOne();
      if (!creator) {
        console.log('❌ No users found in database. Please create a user first.');
        await mongoose.connection.close();
        return;
      }

      // Create test group
      testGroup = await Group.create({
        name: 'Test Weekly Group',
        memberCount: 3,
        frequency: 'WEEKLY',
        collectionDate: todayDayOfWeekFormatted,
        amountPerPerson: 100,
        status: 'ACTIVE',
        createdBy: creator._id,
        participants: [
          { name: creator.name || creator.email, user: creator._id }
        ]
      });

      // Add another user as participant if available
      const anotherUser = await User.findOne({ _id: { $ne: creator._id } });
      if (anotherUser) {
        testGroup.participants.push({
          name: anotherUser.name || anotherUser.email,
          user: anotherUser._id
        });
        await testGroup.save();
      }

      console.log(`✅ Created test group: ${testGroup.name}`);
    } else {
      console.log(`📋 Found existing test group: ${testGroup.name}`);
      
      // Update collection date to today's day of week
      const oldDate = testGroup.collectionDate;
      testGroup.collectionDate = todayDayOfWeekFormatted;
      testGroup.lastCollectionNotificationSent = null; // Reset notification flag
      await testGroup.save();
      
      console.log(`✅ Updated collection day: ${oldDate} → ${todayDayOfWeekFormatted}`);
    }

    // Populate the group
    testGroup = await Group.findById(testGroup._id)
      .populate('participants.user', 'name email')
      .populate('createdBy', 'name email');

    console.log(`\n📊 Group Details:`);
    console.log(`   Name: ${testGroup.name}`);
    console.log(`   Frequency: ${testGroup.frequency}`);
    console.log(`   Collection Day: ${testGroup.collectionDate} (${dayNames[testGroup.collectionDate === 7 ? 0 : testGroup.collectionDate]})`);
    console.log(`   Amount: $${testGroup.amountPerPerson}`);
    console.log(`   Status: ${testGroup.status}`);
    console.log(`   Participants: ${testGroup.participants.length}`);
    testGroup.participants.forEach((p, idx) => {
      const pName = p.user?.name || p.user?.email || p.name || 'Unknown';
      const hasUserId = p.user ? '✅' : '❌';
      console.log(`      ${idx + 1}. ${pName} ${hasUserId} (userId: ${p.user?._id || 'N/A'})`);
    });

    console.log(`\n🔔 Running collection notification check...\n`);

    // Run the scheduler
    await checkAndSendCollectionNotifications();

    console.log(`\n✅ Test completed!`);
    console.log(`\n📋 Check the logs above to see:`);
    console.log(`   - If the weekly group was found`);
    console.log(`   - If notifications were sent to participants`);
    console.log(`   - Any errors that occurred`);

    await mongoose.connection.close();
    console.log('\n📡 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

testWeeklyNotifications();
