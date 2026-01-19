/**
 * Delete user Yusuf from the database
 * Run with: node delete-user-yusuf.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./app/models/User');
const Group = require('./app/models/Group');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ayuuto';

async function deleteYusuf() {
  try {
    console.log('🔍 Finding user Yusuf...\n');
    
    await mongoose.connect(MONGODB_URI, { autoIndex: true });
    console.log('✅ Connected to MongoDB\n');

    // Find Yusuf
    const yusuf = await User.findOne({
      $or: [
        { name: { $regex: /yusuf/i } },
        { email: { $regex: /yusuf/i } }
      ]
    });

    if (!yusuf) {
      console.log('❌ User Yusuf not found');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found user: ${yusuf.name} (${yusuf.email})`);
    console.log(`   User ID: ${yusuf._id}\n`);

    // Check if Yusuf is in any groups
    const groupsWithYusuf = await Group.find({
      'participants.user': yusuf._id
    }).select('name participants');

    console.log(`📋 Groups where Yusuf is a participant: ${groupsWithYusuf.length}\n`);

    if (groupsWithYusuf.length > 0) {
      console.log('⚠️  WARNING: Yusuf is a participant in the following groups:');
      groupsWithYusuf.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.name} (Group ID: ${group._id})`);
      });
      console.log('\n⚠️  Deleting the user will remove them from these groups.\n');
    }

    // Check if Yusuf created any groups
    const groupsCreatedByYusuf = await Group.find({
      createdBy: yusuf._id
    }).select('name');

    if (groupsCreatedByYusuf.length > 0) {
      console.log(`⚠️  WARNING: Yusuf created ${groupsCreatedByYusuf.length} group(s):`);
      groupsCreatedByYusuf.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.name} (Group ID: ${group._id})`);
      });
      console.log('\n⚠️  These groups will remain but the creator reference will be broken.\n');
    }

    // Delete Yusuf
    console.log('🗑️  Deleting user Yusuf...');
    await User.findByIdAndDelete(yusuf._id);
    console.log('✅ User Yusuf deleted successfully\n');

    // Remove Yusuf from all groups where they are a participant
    if (groupsWithYusuf.length > 0) {
      console.log('🔄 Removing Yusuf from groups...');
      for (const group of groupsWithYusuf) {
        group.participants = group.participants.filter(
          (p) => {
            if (!p.user) return true;
            const pUserId = p.user._id ? p.user._id : p.user;
            return pUserId.toString() !== yusuf._id.toString();
          }
        );
        await group.save();
        console.log(`   ✅ Removed from group: ${group.name}`);
      }
      console.log('');
    }

    console.log('✅ Deletion completed!');
    console.log(`   - User deleted: ${yusuf.name} (${yusuf.email})`);
    console.log(`   - Removed from ${groupsWithYusuf.length} group(s)`);

    await mongoose.connection.close();
    console.log('\n📡 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

deleteYusuf();
