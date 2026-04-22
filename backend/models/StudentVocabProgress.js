const mongoose = require('mongoose');

const studentVocabProgressSchema = new mongoose.Schema({
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
  // Exam results
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
  // Unlock tracking
  status: {
    type: String,
    enum: ['locked', 'available', 'passed'],
    default: 'locked'
  },
  unlockedAt: {
    type: Date,
    default: null
  },
  // Practice stats (free practice)
  practiceAttempts: {
    type: Number,
    default: 0
  },
  practiceCorrect: {
    type: Number,
    default: 0
  },
  lastPracticeDate: {
    type: Date,
    default: null
  },
  // Memorization tracking
  wordsMemorized: {
    type: Number,
    default: 0
  },
  wordsTotal: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

studentVocabProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });

// Virtual: memorization percentage for this class
studentVocabProgressSchema.methods.getMemorizationPercent = function() {
  if (this.wordsTotal === 0) return 0;
  return Math.round((this.wordsMemorized / this.wordsTotal) * 100);
};

module.exports = mongoose.model('StudentVocabProgress', studentVocabProgressSchema);
