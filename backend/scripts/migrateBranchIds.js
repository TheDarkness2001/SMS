const mongoose = require('mongoose');
const connectDB = require('../config/database');

// Models
const ClassSchedule = require('../models/ClassSchedule');
const Feedback = require('../models/Feedback');
const StaffEarning = require('../models/TeacherEarning');
const SalaryPayout = require('../models/SalaryPayout');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

/**
 * Migration Script: Populate branchId for existing records
 * 
 * This script updates all existing records that don't have branchId
 * by inferring it from related entities (teacher, student, etc.)
 */

async function migrateBranchIds() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // 1. Migrate ClassSchedule - Get branchId from teacher
    console.log('\n📅 Migrating ClassSchedule records...');
    const schedules = await ClassSchedule.find({ branchId: { $in: [null, undefined] } }).populate('teacher');
    let schedulesUpdated = 0;
    
    for (const schedule of schedules) {
      if (schedule.teacher && schedule.teacher.branchId) {
        schedule.branchId = schedule.teacher.branchId;
        await schedule.save();
        schedulesUpdated++;
      }
    }
    console.log(`✅ Updated ${schedulesUpdated} ClassSchedule records`);

    // 2. Migrate Feedback - Get branchId from teacher
    console.log('\n📝 Migrating Feedback records...');
    const feedbacks = await Feedback.find({ branchId: { $in: [null, undefined] } }).populate('teacher');
    let feedbacksUpdated = 0;
    
    for (const feedback of feedbacks) {
      if (feedback.teacher && feedback.teacher.branchId) {
        feedback.branchId = feedback.teacher.branchId;
        await feedback.save();
        feedbacksUpdated++;
      }
    }
    console.log(`✅ Updated ${feedbacksUpdated} Feedback records`);

    // 3. Migrate StaffEarning - Get branchId from staffId (teacher)
    console.log('\n💰 Migrating StaffEarning records...');
    const earnings = await StaffEarning.find({ branchId: { $in: [null, undefined] } });
    let earningsUpdated = 0;
    
    for (const earning of earnings) {
      const teacher = await Teacher.findById(earning.staffId);
      if (teacher && teacher.branchId) {
        earning.branchId = teacher.branchId;
        await earning.save();
        earningsUpdated++;
      }
    }
    console.log(`✅ Updated ${earningsUpdated} StaffEarning records`);

    // 4. Migrate SalaryPayout - Get branchId from staffId (teacher)
    console.log('\n💵 Migrating SalaryPayout records...');
    const payouts = await SalaryPayout.find({ branchId: { $in: [null, undefined] } });
    let payoutsUpdated = 0;
    
    for (const payout of payouts) {
      const teacher = await Teacher.findById(payout.staffId);
      if (teacher && teacher.branchId) {
        payout.branchId = teacher.branchId;
        await payout.save();
        payoutsUpdated++;
      }
    }
    console.log(`✅ Updated ${payoutsUpdated} SalaryPayout records`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   ClassSchedule: ${schedulesUpdated} records`);
    console.log(`   Feedback: ${feedbacksUpdated} records`);
    console.log(`   StaffEarning: ${earningsUpdated} records`);
    console.log(`   SalaryPayout: ${payoutsUpdated} records`);
    console.log(`   Total: ${schedulesUpdated + feedbacksUpdated + earningsUpdated + payoutsUpdated} records updated`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateBranchIds();
