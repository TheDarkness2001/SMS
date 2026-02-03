const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Teacher = require('../models/Teacher');
const Branch = require('../models/Branch');

/**
 * Script to assign teachers without branchId to Main Branch
 */

async function assignTeachers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Get Main Branch
    const mainBranch = await Branch.findOne({ name: 'Main Branch' });
    if (!mainBranch) {
      console.error('❌ Main Branch not found!');
      process.exit(1);
    }

    console.log(`📍 Main Branch ID: ${mainBranch._id}\n`);

    // Find teachers without branchId
    const teachers = await Teacher.find({ branchId: { $in: [null, undefined] } });
    console.log(`👨‍🏫 Found ${teachers.length} teachers without branchId\n`);

    if (teachers.length === 0) {
      console.log('✅ All teachers already have branches assigned!');
    } else {
      console.log('Assigning teachers to Main Branch:');
      for (const teacher of teachers) {
        teacher.branchId = mainBranch._id;
        await teacher.save();
        console.log(`  ✅ ${teacher.name} → Main Branch`);
      }
      console.log(`\n🎉 Assigned ${teachers.length} teachers to Main Branch!`);
    }

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

assignTeachers();
