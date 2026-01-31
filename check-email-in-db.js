/**
 * Check Email in Database Script
 * 
 * This script checks if an email exists in the database and shows how it's stored.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
const EMAIL_TO_CHECK = process.argv[2] || 'technoarts165@gmail.com';

console.log('🔍 Checking Email in Database...\n');
console.log(`📧 Email to check: ${EMAIL_TO_CHECK}\n`);

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('   Set MONGODB_URI in environment or .env file');
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
      const normalizedEmail = EMAIL_TO_CHECK.toLowerCase().trim();
      console.log(`🔍 Normalized email: ${normalizedEmail}\n`);
      
      // Try exact match (normalized)
      const userExact = await User.findOne({ email: normalizedEmail });
      console.log(`1️⃣  Exact match (normalized): ${userExact ? '✅ FOUND' : '❌ NOT FOUND'}`);
      if (userExact) {
        console.log(`   - User ID: ${userExact._id}`);
        console.log(`   - Name: ${userExact.name}`);
        console.log(`   - Email (as stored): "${userExact.email}"`);
        console.log(`   - Email length: ${userExact.email.length}`);
        console.log(`   - Email char codes: ${Array.from(userExact.email).map(c => c.charCodeAt(0)).join(', ')}`);
      }
      console.log('');
      
      // Try case-insensitive regex search
      const userRegex = await User.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      console.log(`2️⃣  Case-insensitive regex: ${userRegex ? '✅ FOUND' : '❌ NOT FOUND'}`);
      if (userRegex) {
        console.log(`   - User ID: ${userRegex._id}`);
        console.log(`   - Name: ${userRegex.name}`);
        console.log(`   - Email (as stored): "${userRegex.email}"`);
      }
      console.log('');
      
      // Try finding all users with similar emails
      const similarUsers = await User.find({
        email: { $regex: new RegExp(EMAIL_TO_CHECK.split('@')[0], 'i') }
      }).select('name email').limit(10);
      
      console.log(`3️⃣  Similar emails found: ${similarUsers.length}`);
      if (similarUsers.length > 0) {
        console.log('   Similar emails:');
        similarUsers.forEach((u, i) => {
          const match = u.email.toLowerCase() === normalizedEmail ? ' ✅ MATCH' : '';
          console.log(`   ${i + 1}. "${u.email}" (Name: ${u.name})${match}`);
        });
      }
      console.log('');
      
      // Show all users (for debugging - limit to 20)
      const allUsers = await User.find().select('name email').limit(20).sort({ createdAt: -1 });
      console.log(`4️⃣  Recent users in database (last 20):`);
      allUsers.forEach((u, i) => {
        const match = u.email.toLowerCase() === normalizedEmail ? ' ✅ THIS ONE' : '';
        console.log(`   ${i + 1}. "${u.email}" (Name: ${u.name})${match}`);
      });
      console.log('');
      
      // Summary
      if (userExact) {
        console.log('✅ Email found with exact match!');
      } else if (userRegex) {
        console.log('⚠️  Email found with case-insensitive search (case mismatch in database)');
      } else {
        console.log('❌ Email not found in database');
        console.log('   Possible reasons:');
        console.log('   1. Email is stored with different casing');
        console.log('   2. Email has extra spaces or characters');
        console.log('   3. User was created before email normalization');
        console.log('   4. Email doesn\'t exist');
      }
      
      process.exit(0);
    } catch (queryError) {
      console.error('❌ Error querying database:', queryError.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection: FAILED\n');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  });
