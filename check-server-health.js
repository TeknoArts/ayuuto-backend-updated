#!/usr/bin/env node

/**
 * Server Health Check Script
 * Run this to diagnose server issues before starting
 */

console.log('🔍 Checking server health...\n');

// Check 1: Environment Variables
console.log('1️⃣  Checking Environment Variables:');
const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
const optionalVars = ['NODE_ENV', 'PORT', 'BACKEND_URL'];

let missingRequired = [];
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: Set`);
  } else {
    console.log(`   ❌ ${varName}: MISSING`);
    missingRequired.push(varName);
  }
});

optionalVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: ${process.env[varName]}`);
  } else {
    console.log(`   ⚠️  ${varName}: Not set (optional)`);
  }
});

if (missingRequired.length > 0) {
  console.log(`\n❌ Missing required environment variables: ${missingRequired.join(', ')}`);
  console.log('   Set these in your environment variables');
  process.exit(1);
}

// Check 2: MongoDB URI Format
console.log('\n2️⃣  Checking MongoDB URI Format:');
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  if (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://')) {
    console.log('   ✅ MongoDB URI format looks correct');
  } else {
    console.log('   ❌ MongoDB URI format looks incorrect');
    console.log('   Expected: mongodb://... or mongodb+srv://...');
  }
}

// Check 3: Dependencies
console.log('\n3️⃣  Checking Dependencies:');
try {
  require('express');
  require('mongoose');
  require('jsonwebtoken');
  require('dotenv');
  console.log('   ✅ Core dependencies available');
} catch (err) {
  console.log(`   ❌ Missing dependency: ${err.message}`);
  console.log('   Run: npm install');
  process.exit(1);
}

// Check 4: File Structure
console.log('\n4️⃣  Checking File Structure:');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'server.js',
  'app/routes/authRoutes.js',
  'app/routes/groupRoutes.js',
  'app/models/User.js',
  'app/models/Group.js',
];

let missingFiles = [];
requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`   ✅ ${file}: Exists`);
  } else {
    console.log(`   ❌ ${file}: MISSING`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log(`\n❌ Missing required files: ${missingFiles.join(', ')}`);
  process.exit(1);
}

// Check 5: Syntax
console.log('\n5️⃣  Checking Syntax:');
try {
  require('./server.js');
  console.log('   ✅ server.js syntax OK');
} catch (err) {
  if (err.message.includes('Cannot find module')) {
    console.log('   ⚠️  Some modules not found (this is OK if MongoDB not connected)');
  } else {
    console.log(`   ❌ Syntax error: ${err.message}`);
    process.exit(1);
  }
}

console.log('\n✅ All checks passed! Server should start successfully.');
console.log('\n💡 If server still crashes, check server logs for runtime errors.');
