/**
 * Test User Login Script
 * 
 * This script tests if a user can be found and if password comparison works.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
const TEST_EMAIL = process.argv[2] || 'technoarts165@gmail.com';
const TEST_PASSWORD = process.argv[3] || null;

console.log('🔍 Testing User Login...\n');
console.log(`📧 Email: ${TEST_EMAIL}`);
console.log(`🔑 Password: ${TEST_PASSWORD ? '***' : 'Not provided (will only test user lookup)'}\n`);

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
      const normalizedEmail = TEST_EMAIL.toLowerCase().trim();
      console.log(`🔍 Normalized email: ${normalizedEmail}\n`);
      
      // Test 1: Exact match
      console.log('1️⃣  Testing exact match...');
      let user = await User.findOne({ email: normalizedEmail });
      if (user) {
        console.log(`   ✅ Found: ${user.name} (${user.email})`);
        console.log(`   - User ID: ${user._id}`);
        console.log(`   - Email stored as: "${user.email}"`);
        console.log(`   - Password hash exists: ${user.password ? 'Yes' : 'No'}`);
        console.log(`   - Password hash length: ${user.password ? user.password.length : 0}`);
      } else {
        console.log(`   ❌ Not found with exact match`);
      }
      console.log('');
      
      // Test 2: Case-insensitive search
      if (!user) {
        console.log('2️⃣  Testing case-insensitive search...');
        user = await User.findOne({ 
          email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });
        if (user) {
          console.log(`   ✅ Found: ${user.name} (${user.email})`);
          console.log(`   - Email stored as: "${user.email}" (different casing!)`);
          console.log(`   - Password hash exists: ${user.password ? 'Yes' : 'No'}`);
        } else {
          console.log(`   ❌ Not found with case-insensitive search`);
        }
        console.log('');
      }
      
      // Test 3: Find all similar emails
      if (!user) {
        console.log('3️⃣  Searching for similar emails...');
        const similarUsers = await User.find({
          email: { $regex: new RegExp(TEST_EMAIL.split('@')[0], 'i') }
        }).select('name email').limit(10);
        
        if (similarUsers.length > 0) {
          console.log(`   Found ${similarUsers.length} similar email(s):`);
          similarUsers.forEach((u, i) => {
            console.log(`   ${i + 1}. "${u.email}" (Name: ${u.name})`);
          });
        } else {
          console.log(`   No similar emails found`);
        }
        console.log('');
      }
      
      // Test 4: Password comparison (if user found and password provided)
      if (user && TEST_PASSWORD) {
        console.log('4️⃣  Testing password comparison...');
        try {
          const isMatch = await user.comparePassword(TEST_PASSWORD);
          if (isMatch) {
            console.log(`   ✅ Password matches!`);
          } else {
            console.log(`   ❌ Password does NOT match`);
            console.log(`   - This means the password you entered is incorrect`);
            console.log(`   - Or the password hash in database is corrupted`);
          }
        } catch (pwdError) {
          console.log(`   ❌ Password comparison error: ${pwdError.message}`);
        }
        console.log('');
      }
      
      // Summary
      console.log('📊 Summary:');
      if (user) {
        console.log(`   ✅ User exists: ${user.name} (${user.email})`);
        if (TEST_PASSWORD) {
          const isMatch = await user.comparePassword(TEST_PASSWORD);
          if (isMatch) {
            console.log(`   ✅ Password is correct`);
            console.log(`   ✅ Login should work!`);
          } else {
            console.log(`   ❌ Password is incorrect`);
            console.log(`   💡 Solution: Use "Forgot Password" to reset`);
          }
        } else {
          console.log(`   ⚠️  Password not tested (provide password as 3rd argument)`);
        }
      } else {
        console.log(`   ❌ User not found`);
        console.log(`   💡 Check if email is correct or user needs to register`);
      }
      
      process.exit(0);
    } catch (queryError) {
      console.error('❌ Error:', queryError.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection: FAILED\n');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  });
