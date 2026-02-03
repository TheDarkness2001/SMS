const mongoose = require('mongoose');
const connectDB = require('../config/database');

// Models
const ClassSchedule = require('../models/ClassSchedule');
const Feedback = require('../models/Feedback');
const StaffEarning = require('../models/TeacherEarning');
const SalaryPayout = require('../models/SalaryPayout');
const Teacher = require('../models/Teacher');
const Branch = require('../models/Branch');

/**
 * Diagnostic Script: Check branch data integrity
 */

async function diagnoseBranchData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Get all branches
    console.log('🏢 BRANCHES:');
    const branches = await Branch.find();
    console.log(`Total branches: ${branches.length}`);
    branches.forEach(b => {
      console.log(`  - ${b.name} (ID: ${b._id}) - ${b.isActive ? 'Active' : 'Inactive'}`);
    });
    console.log('');

    // Get all teachers and their branches
    console.log('👨‍🏫 TEACHERS:');
    const teachers = await Teacher.find();
    console.log(`Total teachers: ${teachers.length}`);
    const teachersWithBranch = teachers.filter(t => t.branchId);
    const teachersWithoutBranch = teachers.filter(t => !t.branchId);
    console.log(`  - With branchId: ${teachersWithBranch.length}`);
    console.log(`  - Without branchId: ${teachersWithoutBranch.length}`);
    if (teachersWithoutBranch.length > 0) {
      console.log('  Teachers without branchId:');
      teachersWithoutBranch.forEach(t => {
        console.log(`    * ${t.name} (ID: ${t._id})`);
      });
    }
    console.log('');

    // Check ClassSchedule
    console.log('📅 CLASS SCHEDULES:');
    const schedules = await ClassSchedule.find().populate('teacher');
    console.log(`Total schedules: ${schedules.length}`);
    const schedulesWithBranch = schedules.filter(s => s.branchId);
    const schedulesWithoutBranch = schedules.filter(s => !s.branchId);
    console.log(`  - With branchId: ${schedulesWithBranch.length}`);
    console.log(`  - Without branchId: ${schedulesWithoutBranch.length}`);
    if (schedulesWithoutBranch.length > 0) {
      console.log('  Schedules without branchId:');
      schedulesWithoutBranch.forEach(s => {
        const teacherInfo = s.teacher ? `${s.teacher.name} (has branch: ${!!s.teacher.branchId})` : 'No teacher';
        console.log(`    * ${s.className} - ${s.subject} - Teacher: ${teacherInfo}`);
      });
    }
    console.log('');

    // Check Feedback
    console.log('📝 FEEDBACK:');
    const feedbacks = await Feedback.find();
    console.log(`Total feedback: ${feedbacks.length}`);
    const feedbackWithBranch = feedbacks.filter(f => f.branchId);
    const feedbackWithoutBranch = feedbacks.filter(f => !f.branchId);
    console.log(`  - With branchId: ${feedbackWithBranch.length}`);
    console.log(`  - Without branchId: ${feedbackWithoutBranch.length}`);
    console.log('');

    // Check StaffEarning
    console.log('💰 STAFF EARNINGS:');
    const earnings = await StaffEarning.find();
    console.log(`Total earnings: ${earnings.length}`);
    const earningsWithBranch = earnings.filter(e => e.branchId);
    const earningsWithoutBranch = earnings.filter(e => !e.branchId);
    console.log(`  - With branchId: ${earningsWithBranch.length}`);
    console.log(`  - Without branchId: ${earningsWithoutBranch.length}`);
    console.log('');

    // Check SalaryPayout
    console.log('💵 SALARY PAYOUTS:');
    const payouts = await SalaryPayout.find();
    console.log(`Total payouts: ${payouts.length}`);
    const payoutsWithBranch = payouts.filter(p => p.branchId);
    const payoutsWithoutBranch = payouts.filter(p => !p.branchId);
    console.log(`  - With branchId: ${payoutsWithBranch.length}`);
    console.log(`  - Without branchId: ${payoutsWithoutBranch.length}`);
    console.log('');

    console.log('🎉 Diagnosis completed!');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run diagnosis
diagnoseBranchData();
