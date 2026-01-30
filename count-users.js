/**
 * Count Users in Database Script
 * 
 * This script counts the total number of users in the MongoDB database.
 * Run this to check how many users are registered.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./app/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

console.log('🔍 Counting Users in Database...\n');

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('   Set MONGODB_URI in environment or .env file');
  process.exit(1);
}

// Mask password in URI for logging
const maskedUri = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log(`📡 Connecting to: ${maskedUri}`);
console.log('');

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
      // Count total users
      const totalUsers = await User.countDocuments();
      console.log(`👥 Total Users: ${totalUsers}\n`);
      
      // Get some additional stats
      const usersWithEmail = await User.countDocuments({ email: { $exists: true, $ne: '' } });
      const usersWithName = await User.countDocuments({ name: { $exists: true, $ne: '' } });
      
      console.log('📊 User Statistics:');
      console.log(`   - Users with email: ${usersWithEmail}`);
      console.log(`   - Users with name: ${usersWithName}`);
      console.log('');
      
      // Get recent users (last 5)
      const recentUsers = await User.find()
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      
      if (recentUsers.length > 0) {
        console.log('📋 Recent Users (last 5):');
        recentUsers.forEach((user, index) => {
          const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
          console.log(`   ${index + 1}. ${user.name || 'No name'} (${user.email || 'No email'}) - Created: ${date}`);
        });
        console.log('');
      }
      
      // Count by creation date (this month, last month, etc.)
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const usersThisMonth = await User.countDocuments({ createdAt: { $gte: thisMonth } });
      const usersLastMonth = await User.countDocuments({ 
        createdAt: { $gte: lastMonth, $lt: thisMonth } 
      });
      
      console.log('📅 User Growth:');
      console.log(`   - This month: ${usersThisMonth}`);
      console.log(`   - Last month: ${usersLastMonth}`);
      console.log('');
      
      console.log('✅ User count completed successfully!');
      process.exit(0);
    } catch (queryError) {
      console.error('❌ Error querying users:', queryError.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection: FAILED\n');
    console.error(`   Error: ${err.message}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check MONGODB_URI environment variable');
    console.error('   2. Verify MongoDB Atlas → Network Access → IP Whitelist');
    console.error('   3. Test connection string in MongoDB Atlas');
    process.exit(1);
  });
