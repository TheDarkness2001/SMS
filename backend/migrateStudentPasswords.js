const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Student = require('./models/Student');

async function migrateStudentPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student-management');
    console.log('✅ Connected to MongoDB');

    // Find all students without passwords
    const studentsWithoutPasswords = await Student.find({ password: { $exists: false } });
    
    console.log(`\n📋 Found ${studentsWithoutPasswords.length} students without passwords`);

    if (studentsWithoutPasswords.length === 0) {
      console.log('✅ All students already have passwords. No migration needed.');
      await mongoose.connection.close();
      return;
    }

    // Update each student with a DEFAULT password (OPTIONAL - for backward compatibility only)
    // NOTE: It's recommended to ask admins to set their own strong passwords instead
    for (const student of studentsWithoutPasswords) {
      // Use a generic default - ADMINS SHOULD UPDATE THESE
      const defaultPassword = `TempPass123!`; // Generic default
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);
      
      // Update student
      student.password = hashedPassword;
      await student.save();
      
      console.log(`✅ Updated ${student.name} (${student.studentId})`);
      console.log(`   Email: ${student.email}`);
      console.log(`   Default password: ${defaultPassword}\n`);
    }

    console.log(`\n✅ Migration complete! ${studentsWithoutPasswords.length} students updated with default passwords.`);
    console.log('\n⚠️  NOTE: Students should change these default passwords on first login!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run migration
migrateStudentPasswords();
