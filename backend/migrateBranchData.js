const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Payment = require('./models/Payment');
const Branch = require('./models/Branch');

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Find founder
    const founder = await Teacher.findOne({ role: 'founder' });
    if (!founder) {
      console.log('No founder found. Migration aborted.');
      process.exit(1);
    }

    // 2. Check if a branch exists
    let mainBranch = await Branch.findOne({ name: 'Main Branch' });
    if (!mainBranch) {
      console.log('Creating Main Branch...');
      mainBranch = await Branch.create({
        name: 'Main Branch',
        address: 'Default Address',
        phone: '0000000000',
        createdBy: founder._id
      });
      console.log('Main Branch created:', mainBranch._id);
    } else {
      console.log('Main Branch already exists:', mainBranch._id);
    }

    // 3. Assign existing teachers (non-founders) to Main Branch
    const teachersResult = await Teacher.updateMany(
      { role: { $ne: 'founder' }, branchId: { $exists: false } },
      { $set: { branchId: mainBranch._id } }
    );
    console.log(`Updated ${teachersResult.modifiedCount} teachers`);

    // 4. Assign existing students to Main Branch
    const studentsResult = await Student.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: mainBranch._id } }
    );
    console.log(`Updated ${studentsResult.modifiedCount} students`);

    // 5. Assign existing payments to Main Branch
    const paymentsResult = await Payment.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: mainBranch._id } }
    );
    console.log(`Updated ${paymentsResult.modifiedCount} payments`);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();