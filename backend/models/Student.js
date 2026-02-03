const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Please provide student ID'],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Please provide student name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide student email'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Please provide student password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    // Made phone optional to prevent validation errors
  },
  dateOfBirth: {
    type: Date,
    // Made dateOfBirth optional to prevent validation errors
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    // Made gender optional to prevent validation errors
  },
  address: {
    type: String,
    // Made address optional to prevent validation errors
  },
  parentName: {
    type: String
  },
  parentPhone: {
    type: String
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated'],
    default: 'active'
  },
  profileImage: {
    type: String,
    default: ''
  },
  subjects: {
    type: [String],
    default: []
  },
  bloodGroup: {
    type: String,
    default: ''
  },
  medicalConditions: {
    type: String,
    default: ''
  },
  examEligibility: {
    type: Boolean,
    default: true
  },
  examResults: [{
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam'
    },
    examName: String,
    subject: String,
    marksObtained: Number,
    totalMarks: Number,
    grade: String,
    status: {
      type: String,
      enum: ['pass', 'fail'],
      default: 'fail'
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  // Array of subject-specific monthly payments
  subjectPayments: [{
    subject: String,
    amount: Number
  }],
  // Per-class prices per subject
  perClassPrices: {
    type: Map,
    of: Number, // Map of subjectId -> price
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

// Hash student password before saving
studentSchema.pre('save', async function(next) {
  // Track if status is being changed to inactive
  if (this.isModified('status') && this.status === 'inactive') {
    this._wasDeactivated = true;
  }
  
  // Skip if password is not modified or doesn't exist
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    return next(error);
  }
  next();
});

// Compare student password method
studentSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Post-save hook: Clean up references when student is deactivated
studentSchema.post('save', async function(doc) {
  // Only run if status was changed to 'inactive'
  if (doc._wasDeactivated) {
    try {
      console.log(`[Student Cleanup] Student ${doc.name} (${doc._id}) deactivated - removing from groups and schedules`);
      
      const ClassSchedule = mongoose.model('ClassSchedule');
      const ExamGroup = mongoose.model('ExamGroup');
      
      // Remove from all class schedules
      const scheduleResult = await ClassSchedule.updateMany(
        { enrolledStudents: doc._id },
        { $pull: { enrolledStudents: doc._id } }
      );
      console.log(`[Student Cleanup] Removed from ${scheduleResult.modifiedCount} class schedules`);
      
      // Remove from all exam groups
      const groupResult = await ExamGroup.updateMany(
        { students: doc._id },
        { $pull: { students: doc._id } }
      );
      console.log(`[Student Cleanup] Removed from ${groupResult.modifiedCount} exam groups`);
      
      // Clean up the flag
      delete doc._wasDeactivated;
      
    } catch (error) {
      console.error('[Student Cleanup] Error removing student references:', error);
      // Don't throw - we don't want to prevent the student status update
    }
  }
});

// Post-delete hook: Clean up references when student is deleted
studentSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      console.log(`[Student Cleanup] Student ${doc.name} (${doc._id}) deleted - removing from groups and schedules`);
      
      const ClassSchedule = mongoose.model('ClassSchedule');
      const ExamGroup = mongoose.model('ExamGroup');
      
      // Remove from all class schedules
      await ClassSchedule.updateMany(
        { enrolledStudents: doc._id },
        { $pull: { enrolledStudents: doc._id } }
      );
      
      // Remove from all exam groups
      await ExamGroup.updateMany(
        { students: doc._id },
        { $pull: { students: doc._id } }
      );
      
    } catch (error) {
      console.error('[Student Cleanup] Error cleaning up deleted student references:', error);
    }
  }
});

module.exports = mongoose.model('Student', studentSchema);