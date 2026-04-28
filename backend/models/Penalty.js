const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  type: {
    type: String,
    enum: ['spoken_uzbek', 'missed_presentation', 'missed_writing_homework', 'missed_word_memorization', 'other', 'bonus'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassSchedule',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    enum: ['manual', 'auto'],
    default: 'manual'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    default: null
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  isReverted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

penaltySchema.index({ studentId: 1, date: -1 });
penaltySchema.index({ branchId: 1, date: -1 });
penaltySchema.index({ type: 1, date: -1 });

module.exports = mongoose.model('Penalty', penaltySchema);
