/**
 * Check Database Connection Script
 * 
 * This script shows which database is currently connected.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

console.log('🔍 Checking Database Connection...\n');

// Check if MONGODB_URI is set
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set!');
  console.error('   Set MONGODB_URI in environment or .env file');
  process.exit(1);
}

// Mask password in URI for logging
const maskedUri = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log(`📡 Connection String: ${maskedUri}`);
console.log('');

// Extract database name from URI
const dbNameMatch = MONGODB_URI.match(/\/([^?]+)/);
const dbNameFromUri = dbNameMatch ? dbNameMatch[1] : 'unknown';

console.log(`📊 Database Information:`);
console.log(`   - Database name (from URI): ${dbNameFromUri}`);
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
    
    const connection = mongoose.connection;
    const db = connection.db;
    
    console.log(`📊 Connection Details:`);
    console.log(`   - Database Name: ${connection.name}`);
    console.log(`   - Host: ${connection.host}`);
    console.log(`   - Port: ${connection.port || 'N/A (using SRV)'}`);
    console.log(`   - Ready State: ${connection.readyState} (1=connected)`);
    console.log('');
    
    // List all collections
    try {
      const collections = await db.listCollections().toArray();
      console.log(`📁 Collections in database (${collections.length}):`);
      if (collections.length > 0) {
        collections.forEach((col, i) => {
          console.log(`   ${i + 1}. ${col.name}`);
        });
      } else {
        console.log('   (No collections found)');
      }
      console.log('');
      
      // Get database stats
      const stats = await db.stats();
      console.log(`📈 Database Statistics:`);
      console.log(`   - Collections: ${stats.collections}`);
      console.log(`   - Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - Indexes: ${stats.indexes}`);
      console.log('');
    } catch (statsError) {
      console.warn('⚠️  Could not fetch database statistics:', statsError.message);
    }
    
    // Count documents in main collections
    try {
      const User = mongoose.connection.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
      const Group = mongoose.connection.models.Group || mongoose.model('Group', new mongoose.Schema({}, { strict: false }));
      
      const userCount = await User.countDocuments();
      const groupCount = await Group.countDocuments();
      
      console.log(`📊 Document Counts:`);
      console.log(`   - Users: ${userCount}`);
      console.log(`   - Groups: ${groupCount}`);
      console.log('');
    } catch (countError) {
      console.warn('⚠️  Could not count documents (models not loaded):', countError.message);
    }
    
    console.log('✅ Database connection check completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection: FAILED\n');
    console.error(`   Error: ${err.message}`);
    console.error(`   Error Name: ${err.name}`);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check MONGODB_URI environment variable');
    console.error('   2. Verify MongoDB Atlas → Network Access → IP Whitelist');
    console.error('   3. Test connection string in MongoDB Atlas');
    process.exit(1);
  });
