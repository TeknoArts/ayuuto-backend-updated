/**
 * Test Script: Add Participant with Email (Non-Registered)
 * 
 * This script tests adding a non-registered participant with email to a group.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Group = require('./app/models/Group');
const User = require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
const TEST_EMAIL = process.argv[2] || 'test@example.com';
const TEST_GROUP_NAME = process.argv[3] || 'Test Group';

console.log('🧪 Test: Add Non-Registered Participant with Email');
console.log('='.repeat(60));
console.log('');
console.log(`📧 Test Email: ${TEST_EMAIL}`);
console.log(`👥 Test Group: ${TEST_GROUP_NAME}`);
console.log('');

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  process.exit(1);
}

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    console.log('✅ Connected to MongoDB successfully\n');
    
    try {
      // Find or create a test group
      let testGroup = await Group.findOne({ name: TEST_GROUP_NAME });
      
      if (!testGroup) {
        // Find any user to be the creator
        const creator = await User.findOne();
        if (!creator) {
          console.error('❌ No users found in database. Please create a user first.');
          process.exit(1);
        }
        
        console.log(`📝 Creating test group: ${TEST_GROUP_NAME}`);
        testGroup = await Group.create({
          name: TEST_GROUP_NAME,
          memberCount: 5,
          createdBy: creator._id,
          participants: [],
        });
        console.log(`✅ Created test group: ${testGroup._id}\n`);
      } else {
        console.log(`✅ Found existing test group: ${testGroup._id}\n`);
      }
      
      // Check if participant already exists
      const existingParticipant = testGroup.participants.find(
        p => p.email && p.email.toLowerCase() === TEST_EMAIL.toLowerCase()
      );
      
      if (existingParticipant) {
        console.log(`⚠️  Participant with email ${TEST_EMAIL} already exists in group`);
        console.log(`   Name: ${existingParticipant.name}`);
        console.log(`   Email: ${existingParticipant.email}`);
        console.log(`   Has userId: ${existingParticipant.user ? 'Yes' : 'No'}`);
        console.log('');
        console.log('💡 To test again, remove this participant first or use a different email');
        process.exit(0);
      }
      
      // Check if email matches a registered user
      const registeredUser = await User.findOne({ 
        email: TEST_EMAIL.toLowerCase().trim() 
      });
      
      if (registeredUser) {
        console.log(`⚠️  Email ${TEST_EMAIL} belongs to a registered user:`);
        console.log(`   Name: ${registeredUser.name}`);
        console.log(`   User ID: ${registeredUser._id}`);
        console.log('');
        console.log('💡 This test is for NON-REGISTERED participants. Use a different email.');
        process.exit(0);
      }
      
      // Add non-registered participant with email
      console.log(`📝 Adding non-registered participant:`);
      console.log(`   Name: Test User`);
      console.log(`   Email: ${TEST_EMAIL}`);
      console.log('');
      
      testGroup.participants.push({
        name: 'Test User',
        email: TEST_EMAIL.toLowerCase().trim(),
        order: null,
        isPaid: false,
      });
      
      // Generate shareCode if doesn't exist
      if (!testGroup.shareCode) {
        const { generateShareCode } = require('./app/utils/shareToken');
        let shareCode;
        let attempts = 0;
        do {
          shareCode = generateShareCode();
          const existing = await Group.findOne({ shareCode });
          if (!existing) break;
          attempts++;
          if (attempts > 10) {
            console.error('❌ Failed to generate unique share code');
            break;
          }
        } while (true);
        
        if (shareCode) {
          testGroup.shareCode = shareCode;
          testGroup.isShareable = true;
          testGroup.shareTokenExpiresAt = new Date();
          testGroup.shareTokenExpiresAt.setDate(testGroup.shareTokenExpiresAt.getDate() + 90);
          console.log(`✅ Generated shareCode: ${shareCode}`);
        }
      }
      
      await testGroup.save();
      console.log(`✅ Participant added successfully\n`);
      
      // Verify participant was saved with email
      const savedGroup = await Group.findById(testGroup._id);
      const savedParticipant = savedGroup.participants.find(
        p => p.email && p.email.toLowerCase() === TEST_EMAIL.toLowerCase()
      );
      
      if (savedParticipant) {
        console.log('✅ Verification:');
        console.log(`   Participant saved with email: ${savedParticipant.email}`);
        console.log(`   Has userId: ${savedParticipant.user ? 'Yes' : 'No'}`);
        console.log(`   Name: ${savedParticipant.name}`);
        console.log('');
        
        // Test email sending
        console.log('📧 Testing email sending...');
        const { sendGroupInvitationEmail } = require('./app/services/emailService');
        const admin = await User.findById(savedGroup.createdBy).select('name email');
        const adminName = admin ? admin.name : 'Group Admin';
        
        try {
          await sendGroupInvitationEmail(
            savedParticipant.email,
            savedParticipant.name,
            savedGroup.name,
            adminName,
            savedGroup._id.toString(),
            savedGroup.shareCode
          );
          console.log(`✅ Email sent successfully to: ${savedParticipant.email}`);
          console.log('');
          console.log('📬 Check the email inbox for the invitation!');
        } catch (emailError) {
          console.error(`❌ Error sending email: ${emailError.message}`);
          console.error('   Make sure email service is configured (SendGrid, Gmail, or Mailtrap)');
        }
      } else {
        console.error('❌ Participant was not saved correctly');
      }
      
      console.log('');
      console.log('✅ Test completed!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Test error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection: FAILED\n');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  });
