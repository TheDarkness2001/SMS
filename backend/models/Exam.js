const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: [true, 'Please provide exam name'],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Please provide subject']
  },
  class: {
    type: String,
    required: [true, 'Please provide class']
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSchedule'
  },
  examDate: {
    type: Date,
    required: [true, 'Please provide exam date']
  },
  startTime: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  totalMarks: {
    type: Number,
    required: [true, 'Please provide total marks']
  },
  passingMarks: {
    type: Number,
    required: [true, 'Please provide passing marks']
  },
  examType: {
    type: String,
    enum: ['mid-term', 'final', 'quiz', 'practical', 'assignment'],
    default: 'mid-term'
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'archived'],
    default: 'scheduled'
  },
  results: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    marksObtained: {
      type: Number,
      default: 0
    },
    grade: {
      type: String,
      default: ''
    },
    remarks: {
      type: String,
      default: ''
    },
    enrollmentStatus: {
      type: String,
      enum: ['enrolled', 'allowed', 'denied', 'attended', 'absent'],
      default: 'enrolled'
    }
  }],
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);