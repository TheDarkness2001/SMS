const mongoose = require('mongoose');

const presentationScoreSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  score: {
    type: Number,
    min: 1,
    max: 10,
    required: true
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
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  }
}, {
  timestamps: true
});

presentationScoreSchema.index({ studentId: 1, date: -1 });
presentationScoreSchema.index({ branchId: 1, date: -1 });
presentationScoreSchema.index({ date: -1 });

module.exports = mongoose.model('PresentationScore', presentationScoreSchema);
