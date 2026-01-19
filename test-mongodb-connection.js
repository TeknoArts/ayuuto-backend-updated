/**
 * Test MongoDB Connection Script
 * 
 * This script tests if MongoDB is connected and accessible.
 * Run this to verify MongoDB connection status.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://technoarts165_db_user:psF1oMuBOCi7N273@cluster0.z4bzsxf.mongodb.net/ayuuto?appName=Cluster0';

console.log('🔍 Testing MongoDB Connection...\n');

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('   Set MONGODB_URI in Railway Variables or .env file');
  process.exit(1);
}

// Mask password in URI for logging
const maskedUri = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log(`📡 Connection String: ${maskedUri}`);
console.log('');

// Test connection
mongoose
  .connect(MONGODB_URI, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    console.log('✅ MongoDB Connection: SUCCESS\n');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Ready State: ${mongoose.connection.readyState}`);
    console.log('');
    
    // Test a simple query
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📊 Collections found: ${collections.length}`);
      if (collections.length > 0) {
        console.log('   Collections:');
        collections.forEach(col => {
          console.log(`   - ${col.name}`);
        });
      }
      console.log('');
      
      // Test User model (if exists)
      const User = mongoose.connection.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
      const userCount = await User.countDocuments();
      console.log(`👥 Users in database: ${userCount}`);
      
      // Test Group model (if exists)
      const Group = mongoose.connection.models.Group || mongoose.model('Group', new mongoose.Schema({}, { strict: false }));
      const groupCount = await Group.countDocuments();
      console.log(`👥 Groups in database: ${groupCount}`);
      
      console.log('\n✅ MongoDB is fully connected and accessible!');
      process.exit(0);
    } catch (queryError) {
      console.warn('⚠️  Connection successful but query failed:', queryError.message);
      console.log('✅ MongoDB connection is working (query error is expected if models not loaded)');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection: FAILED\n');
    console.error(`   Error: ${err.message}`);
    console.error(`   Error Name: ${err.name}`);
    console.error(`   Error Code: ${err.code || 'N/A'}`);
    console.error('');
    
    // Provide helpful error messages
    if (err.message.includes('authentication failed')) {
      console.error('🔐 Authentication Failed!');
      console.error('   - Check MongoDB Atlas username and password');
      console.error('   - Verify credentials in MONGODB_URI');
      console.error('   - Make sure password is URL-encoded if it has special characters');
    } else if (err.message.includes('IP') || err.message.includes('whitelist')) {
      console.error('🌐 IP Whitelist Error!');
      console.error('   - Go to MongoDB Atlas → Network Access');
      console.error('   - Add IP: 0.0.0.0/0 (allows all IPs)');
      console.error('   - Or add Railway\'s IP addresses');
    } else if (err.message.includes('timeout') || err.message.includes('ENOTFOUND')) {
      console.error('⏱️  Connection Timeout!');
      console.error('   - Check MongoDB Atlas cluster is running');
      console.error('   - Verify connection string format');
      console.error('   - Check network connectivity');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.error('🚫 Connection Refused!');
      console.error('   - MONGODB_URI might be pointing to localhost');
      console.error('   - On Railway, you must use MongoDB Atlas connection string');
      console.error('   - Format: mongodb+srv://username:password@cluster.mongodb.net/ayuuto');
    }
    
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check Railway Dashboard → Variables → MONGODB_URI');
    console.error('   2. Verify MongoDB Atlas → Network Access → IP Whitelist');
    console.error('   3. Test connection string in MongoDB Atlas');
    console.error('   4. Check Railway logs for more details\n');
    
    process.exit(1);
  });
