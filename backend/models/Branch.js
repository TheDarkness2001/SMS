const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true,
    unique: true
  },
  address: {
    type: String,
    required: [true, 'Branch address is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Branch phone is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  }
}, {
  timestamps: true
});

// Index for performance
branchSchema.index({ isActive: 1 });
branchSchema.index({ createdBy: 1 });

// Prevent deletion if branch has associated data
branchSchema.pre('remove', async function(next) {
  const Student = mongoose.model('Student');
  const Teacher = mongoose.model('Teacher');
  const Payment = mongoose.model('Payment');
  
  const [studentCount, teacherCount, paymentCount] = await Promise.all([
    Student.countDocuments({ branchId: this._id }),
    Teacher.countDocuments({ branchId: this._id }),
    Payment.countDocuments({ branchId: this._id })
  ]);
  
  if (studentCount > 0 || teacherCount > 0 || paymentCount > 0) {
    throw new Error('Cannot delete branch with existing data. Please deactivate instead.');
  }
  
  next();
});

module.exports = mongoose.model('Branch', branchSchema);
