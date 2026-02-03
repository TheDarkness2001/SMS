const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  schedule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSchedule',
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Please provide subject name']
  },
  classLevel: {
    type: String,
    default: '',
    // Format: "1.2" or "retake1.2" or "retake2.2" etc.
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  feedbackDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Simple 3 fields for daily feedback (0-100%)
  homework: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  behavior: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  participation: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  // NEW: Support for Exam Days
  isExamDay: {
    type: Boolean,
    default: false
  },
  examPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  // Optional teacher notes
  notes: {
    type: String,
    default: ''
  },
  // Track if parent viewed this feedback
  parentViewed: {
    type: Boolean,
    default: false
  },
  parentComments: {
    type: String,
    default: ''
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

// Index for quick lookups
feedbackSchema.index({ student: 1, feedbackDate: -1 });
feedbackSchema.index({ teacher: 1, feedbackDate: -1 });
feedbackSchema.index({ schedule: 1, feedbackDate: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);