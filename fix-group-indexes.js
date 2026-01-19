/**
 * Script to fix MongoDB indexes for Group model
 * Drops and recreates shareToken and shareCode indexes with sparse: true
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function fixIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('groups');

    console.log('\n📋 Current indexes:');
    const currentIndexes = await collection.indexes();
    currentIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Drop existing shareToken index if it exists
    try {
      console.log('\n🗑️  Dropping shareToken_1 index...');
      await collection.dropIndex('shareToken_1');
      console.log('✅ Dropped shareToken_1 index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  shareToken_1 index does not exist, skipping...');
      } else {
        throw error;
      }
    }

    // Drop existing shareCode index if it exists
    try {
      console.log('🗑️  Dropping shareCode_1 index...');
      await collection.dropIndex('shareCode_1');
      console.log('✅ Dropped shareCode_1 index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  shareCode_1 index does not exist, skipping...');
      } else {
        throw error;
      }
    }

    // Create new sparse indexes
    console.log('\n🔨 Creating new sparse indexes...');
    
    await collection.createIndex(
      { shareToken: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'shareToken_1'
      }
    );
    console.log('✅ Created shareToken_1 index (sparse, unique)');

    await collection.createIndex(
      { shareCode: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'shareCode_1'
      }
    );
    console.log('✅ Created shareCode_1 index (sparse, unique)');

    console.log('\n📋 Updated indexes:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)} (sparse: ${index.sparse || false})`);
    });

    console.log('\n✅ Index fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixIndexes();
