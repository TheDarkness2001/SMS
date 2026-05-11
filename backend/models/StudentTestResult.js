const mongoose = require('mongoose');

const studentTestResultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  topicTestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TopicTest',
    required: true
  },
  videoLessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoLesson',
    required: true
  },
  mode: {
    type: String,
    enum: ['practice', 'exam'],
    required: true
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  correctCount: {
    type: Number,
    default: 0
  },
  bestScore: {
    type: Number,
    default: 0
  },
  attempts: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  warnings: {
    type: Number,
    default: 0
  },
  terminated: {
    type: Boolean,
    default: false
  },
  // Per-question answer log for the LATEST attempt
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    userAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean
  }],
  completedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

studentTestResultSchema.index({ studentId: 1, topicTestId: 1, mode: 1 });
studentTestResultSchema.index({ videoLessonId: 1 });

module.exports = mongoose.model('StudentTestResult', studentTestResultSchema);
