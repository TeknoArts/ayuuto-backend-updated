/**
 * Check Database Configuration Script
 * 
 * This script shows which database each server (local vs Railway) is configured to use.
 */

require('dotenv').config();

console.log('🔍 Checking Database Configuration...\n');

// Check local configuration
const localMongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';
const isLocalDefault = !process.env.MONGODB_URI;

// Mask password for display
const maskedLocalUri = localMongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');

console.log('📊 Local Server Configuration:');
console.log(`   MONGODB_URI: ${maskedLocalUri}`);
console.log(`   Source: ${isLocalDefault ? '⚠️  DEFAULT (not set in .env)' : '✅ .env file'}`);
console.log('');

// Extract database info
let localDbName = 'unknown';
let localHost = 'unknown';

if (localMongoUri.includes('mongodb+srv://')) {
  // Atlas connection
  const match = localMongoUri.match(/mongodb\+srv:\/\/[^@]+@([^/]+)\/([^?]+)/);
  if (match) {
    localHost = match[1];
    localDbName = match[2];
  }
  console.log(`   Type: 🌐 MongoDB Atlas (Cloud)`);
} else if (localMongoUri.includes('localhost') || localMongoUri.includes('127.0.0.1')) {
  // Local MongoDB
  const match = localMongoUri.match(/mongodb:\/\/[^:]+:[^/]+\/([^?]+)/);
  if (match) {
    localDbName = match[1];
  }
  localHost = 'localhost:27017';
  console.log(`   Type: 💻 Local MongoDB`);
} else {
  // Other remote MongoDB
  const match = localMongoUri.match(/mongodb:\/\/[^@]+@([^/]+)\/([^?]+)/);
  if (match) {
    localHost = match[1];
    localDbName = match[2];
  }
  console.log(`   Type: 🌐 Remote MongoDB`);
}

console.log(`   Database: ${localDbName}`);
console.log(`   Host: ${localHost}`);
console.log('');

// Railway configuration (from environment)
console.log('📊 Railway Server Configuration:');
console.log(`   MONGODB_URI: Set in Railway Variables`);
console.log(`   Expected: mongodb+srv://***:***@cluster0.z4bzsxf.mongodb.net/ayuuto`);
console.log(`   Type: 🌐 MongoDB Atlas (Cloud)`);
console.log(`   Database: ayuuto`);
console.log(`   Host: cluster0.z4bzsxf.mongodb.net`);
console.log('');

// Comparison
console.log('🔍 Comparison:');
console.log('');

if (localMongoUri.includes('cluster0.z4bzsxf.mongodb.net') && localDbName === 'ayuuto') {
  console.log('✅ MATCH: Both servers are using the SAME database!');
  console.log('   - Local: Atlas cluster0.z4bzsxf.mongodb.net/ayuuto');
  console.log('   - Railway: Atlas cluster0.z4bzsxf.mongodb.net/ayuuto');
  console.log('');
  console.log('✅ Both will have the same users and data');
} else if (localMongoUri.includes('localhost') || localMongoUri.includes('127.0.0.1')) {
  console.log('❌ MISMATCH: Servers are using DIFFERENT databases!');
  console.log('   - Local: Local MongoDB (localhost:27017/ayuuto)');
  console.log('   - Railway: Atlas cluster0.z4bzsxf.mongodb.net/ayuuto');
  console.log('');
  console.log('⚠️  This means:');
  console.log('   - Different users in each database');
  console.log('   - Login works in one but not the other');
  console.log('   - Data is not synced');
  console.log('');
  console.log('💡 Solution:');
  console.log('   1. Update .env file with Atlas connection string');
  console.log('   2. Or migrate local data to Atlas');
} else if (localDbName !== 'ayuuto') {
  console.log('❌ MISMATCH: Different database names!');
  console.log(`   - Local: ${localDbName}`);
  console.log('   - Railway: ayuuto');
  console.log('');
  console.log('💡 Solution: Update .env MONGODB_URI to use "ayuuto" database');
} else {
  console.log('⚠️  UNKNOWN: Cannot determine if databases match');
  console.log('   Check Railway Dashboard → Variables → MONGODB_URI');
  console.log('   And compare with local .env file');
}

console.log('');

// Recommendations
if (isLocalDefault) {
  console.log('📝 Recommendations:');
  console.log('   1. Create/update .env file with Atlas connection string');
  console.log('   2. Format: MONGODB_URI=mongodb+srv://username:password@cluster0.z4bzsxf.mongodb.net/ayuuto');
  console.log('   3. Restart local server');
  console.log('');
}
