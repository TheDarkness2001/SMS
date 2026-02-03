const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Student = require('./models/Student');

mongoose.connect('mongodb://localhost:27017/student_management_system')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const students = await Student.find();
    console.log(`Found ${students.length} students`);
    
    for (const student of students) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('student123', salt);
      
      await Student.updateOne(
        { _id: student._id },
        { $set: { password: hashedPassword } }
      );
      
      console.log('✅ Updated password for:', student.email);
    }
    
    console.log('\n✅ All student passwords updated to: student123');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
