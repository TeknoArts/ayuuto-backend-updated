/**
 * Clear All Data from Database Script
 * 
 * ⚠️  WARNING: This will DELETE ALL DATA from the database!
 * Use with caution. This action cannot be undone.
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Allow connection string as command line argument
const MONGODB_URI = process.argv[2] || process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!');
console.log('='.repeat(60));
console.log('');

// Show which database will be cleared
if (process.argv[2]) {
  console.log('📡 Using connection string from command line argument');
} else if (process.env.MONGODB_URI) {
  console.log('📡 Using MONGODB_URI from .env file');
} else {
  console.log('⚠️  Using default localhost (MONGODB_URI not set)');
  console.log('   To clear Atlas database, provide connection string as argument:');
  console.log('   node clear-database.js "mongodb+srv://user:pass@cluster.mongodb.net/ayuuto"');
  console.log('');
}

// Mask password in URI for logging
const maskedUri = MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
console.log(`📡 Database: ${maskedUri}`);
console.log('');

// Extract database info
let dbName = 'unknown';
let dbHost = 'unknown';

if (MONGODB_URI.includes('mongodb+srv://')) {
  const match = MONGODB_URI.match(/mongodb\+srv:\/\/[^@]+@([^/]+)\/([^?]+)/);
  if (match) {
    dbHost = match[1];
    dbName = match[2];
  }
  console.log(`🌐 Type: MongoDB Atlas (Cloud)`);
} else {
  const match = MONGODB_URI.match(/mongodb:\/\/[^:]+:[^/]+\/([^?]+)/);
  if (match) {
    dbName = match[1];
  }
  dbHost = 'localhost:27017';
  console.log(`💻 Type: Local MongoDB`);
}

console.log(`📊 Database Name: ${dbName}`);
console.log(`🌐 Host: ${dbHost}`);
console.log('');

// Confirm before proceeding
console.log('⚠️  This will DELETE:');
console.log('   - All users');
console.log('   - All groups');
console.log('   - All notifications');
console.log('   - All other collections');
console.log('');
console.log('❌ This action CANNOT be undone!');
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
      const db = mongoose.connection.db;
      
      // Get all collections
      const collections = await db.listCollections().toArray();
      
      if (collections.length === 0) {
        console.log('📭 Database is already empty. No collections found.');
        process.exit(0);
      }
      
      console.log(`📋 Found ${collections.length} collection(s):`);
      collections.forEach((col, i) => {
        console.log(`   ${i + 1}. ${col.name}`);
      });
      console.log('');
      
      // Count documents before deletion
      console.log('📊 Document counts before deletion:');
      const counts = {};
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        counts[col.name] = count;
        console.log(`   - ${col.name}: ${count} document(s)`);
      }
      console.log('');
      
      // Delete all documents from each collection
      console.log('🗑️  Deleting all documents...');
      for (const col of collections) {
        const result = await db.collection(col.name).deleteMany({});
        console.log(`   ✅ ${col.name}: Deleted ${result.deletedCount} document(s)`);
      }
      console.log('');
      
      // Verify deletion
      console.log('🔍 Verifying deletion...');
      let totalRemaining = 0;
      for (const col of collections) {
        const remaining = await db.collection(col.name).countDocuments();
        totalRemaining += remaining;
        if (remaining > 0) {
          console.log(`   ⚠️  ${col.name}: ${remaining} document(s) still remain`);
        } else {
          console.log(`   ✅ ${col.name}: Empty`);
        }
      }
      console.log('');
      
      if (totalRemaining === 0) {
        console.log('✅ All data cleared successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - Collections processed: ${collections.length}`);
        console.log(`   - Total documents deleted: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
        console.log(`   - Remaining documents: 0`);
      } else {
        console.log(`⚠️  Warning: ${totalRemaining} document(s) still remain in database`);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Error clearing database:', error.message);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection: FAILED\n');
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  });
