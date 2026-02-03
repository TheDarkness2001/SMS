const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  classScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSchedule',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  students: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'absent'
    },
    isCompleted: {
      type: Boolean,
      default: false
    }
  }],
  roomNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'canceled'],
    default: 'scheduled'
  },
  isTeacherAbsent: {
    type: Boolean,
    default: false
  },
  isCanceled: {
    type: Boolean,
    default: false
  },
  cancellationReason: {
    type: String,
    maxlength: 500
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
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

// Index for efficient queries
classSchema.index({ date: -1 });
classSchema.index({ teacherId: 1, date: -1 });
classSchema.index({ subjectId: 1, date: -1 });
classSchema.index({ status: 1 });

module.exports = mongoose.model('Class', classSchema);