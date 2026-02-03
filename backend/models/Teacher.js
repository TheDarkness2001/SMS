const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  teacherId: {
    type: String,
    unique: true,
    sparse: true  // Allow null/undefined values temporarily for existing records
  },
  name: {
    type: String,
    required: [true, 'Please provide teacher name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    // Removed required constraint to make it optional
    default: ''
  },
  subject: {
    type: [String],
    required: [true, 'Please provide at least one subject']
  },
  department: {
    type: String,
    default: 'General'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave'],
    default: 'active'
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'sales', 'receptionist', 'manager', 'founder'],
    default: 'teacher',
    lowercase: true,
    trim: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  permissions: {
    canViewPayments: { type: Boolean, default: false },
    canManagePayments: { type: Boolean, default: false },
    canViewRevenue: { type: Boolean, default: false },
    canManageScheduler: { type: Boolean, default: false },
    canViewTimetable: { type: Boolean, default: true },
    canManageTimetable: { type: Boolean, default: false },
    canManageStudents: { type: Boolean, default: false },
    canManageExams: { type: Boolean, default: false },
    canManageAttendance: { type: Boolean, default: true },
    canViewFeedback: { type: Boolean, default: true },
    canManageFeedback: { type: Boolean, default: false },
    canAccessSettings: { type: Boolean, default: false }
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  address: {
    type: String,
    default: ''
  },
  qualification: {
    type: String,
    default: ''
  },
  perClassEarning: {
    type: Number,
    default: 0,
    min: 0
  },
  perClassEarnings: {
    type: Map,
    of: Number, // Map of subjectId -> earning rate
    default: {}
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Hash password before saving
teacherSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
teacherSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Teacher', teacherSchema);