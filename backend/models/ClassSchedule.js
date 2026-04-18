const mongoose = require('mongoose');

const classScheduleSchema = new mongoose.Schema({
  className: {
    type: String,
    required: [true, 'Please provide class name'],
    trim: true
  },
  section: {
    type: String,
    default: 'A'
  },
  // LINKED: Reference to Subject model
  subjectRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null
  },
  // Keep subject for backward compatibility (can be ObjectId or String for custom subjects)
  subject: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Please provide subject']
  },
  // Link to Subject Group (ExamGroup) - now the primary linking mechanism
  subjectGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamGroup'
  },
  // Store enrolled students for validation
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherName: {
    type: String,
    required: [true, 'Please provide teacher name']
  },
  roomNumber: {
    type: String,
    required: [true, 'Please provide room number'],
    trim: true
  },
  scheduledDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
    default: 'weekly'
  },
  startTime: {
    type: String,
    required: [true, 'Please provide start time']
  },
  endTime: {
    type: String,
    required: [true, 'Please provide end time']
  },
  isActive: {
    type: Boolean,
    default: true
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

// Index for efficient querying
// classScheduleSchema.index({ className: 1, section: 1, subject: 1 }, { unique: true }); // REMOVED: Allows multiple schedules for same class
classScheduleSchema.index({ teacher: 1 });
classScheduleSchema.index({ roomNumber: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('ClassSchedule', classScheduleSchema);