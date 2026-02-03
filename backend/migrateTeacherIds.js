const mongoose = require('mongoose');
const Teacher = require('./models/Teacher');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management');

const migrateTeacherIds = async () => {
  try {
    console.log('Starting teacher ID migration...');
    
    // Get all teachers without teacherId
    const teachers = await Teacher.find({ teacherId: { $exists: false } }).sort({ createdAt: 1 });
    
    if (teachers.length === 0) {
      console.log('No teachers need migration. All teachers already have IDs.');
      process.exit(0);
    }
    
    console.log(`Found ${teachers.length} teachers without IDs`);
    
    // Get the highest existing teacher ID number
    const teachersWithIds = await Teacher.find({ teacherId: { $exists: true } }).sort({ teacherId: -1 }).limit(1);
    let nextId = 1;
    
    if (teachersWithIds.length > 0) {
      const lastId = teachersWithIds[0].teacherId;
      const lastNumber = parseInt(lastId.replace('T', ''));
      nextId = lastNumber + 1;
    }
    
    // Update each teacher with a sequential ID
    for (const teacher of teachers) {
      const teacherId = `T${String(nextId).padStart(4, '0')}`;
      await Teacher.findByIdAndUpdate(teacher._id, { teacherId });
      console.log(`Updated ${teacher.name} with ID: ${teacherId}`);
      nextId++;
    }
    
    console.log('\nMigration completed successfully!');
    console.log(`Total teachers updated: ${teachers.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
migrateTeacherIds();
