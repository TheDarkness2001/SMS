const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Student = require('../models/Student');
const ClassSchedule = require('../models/ClassSchedule');
const ExamGroup = require('../models/ExamGroup');

const cleanupInactiveStudents = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB for cleanup...');

    // 1. Find all inactive students
    const inactiveStudents = await Student.find({ status: 'inactive' }).select('_id name');
    const inactiveIds = inactiveStudents.map(s => s._id);

    console.log(`Found ${inactiveStudents.length} inactive students.`);

    if (inactiveIds.length === 0) {
      console.log('No inactive students to clean up.');
      process.exit(0);
    }

    // 2. Remove them from ClassSchedules
    console.log('Removing inactive students from ClassSchedules...');
    const scheduleResult = await ClassSchedule.updateMany(
      { enrolledStudents: { $in: inactiveIds } },
      { $pull: { enrolledStudents: { $in: inactiveIds } } }
    );
    console.log(`Updated ${scheduleResult.modifiedCount} class schedules.`);

    // 3. Remove them from ExamGroups
    console.log('Removing inactive students from ExamGroups...');
    const groupResult = await ExamGroup.updateMany(
      { students: { $in: inactiveIds } },
      { $pull: { students: { $in: inactiveIds } } }
    );
    console.log(`Updated ${groupResult.modifiedCount} exam groups.`);

    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
};

cleanupInactiveStudents();
