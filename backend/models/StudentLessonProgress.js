const mongoose = require('mongoose');

const studentLessonProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  status: {
    type: String,
    enum: ['locked', 'available', 'passed'],
    default: 'locked'
  },
  examAttempts: {
    type: Number,
    default: 0
  },
  bestExamScore: {
    type: Number,
    default: 0
  },
  lastExamDate: {
    type: Date,
    default: null
  },
  unlockedAt: {
    type: Date,
    default: null
  }
});

studentLessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model('StudentLessonProgress', studentLessonProgressSchema);
