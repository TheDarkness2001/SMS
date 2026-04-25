const mongoose = require('mongoose');

const studentSentenceProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  sentenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sentence',
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  correctCount: {
    type: Number,
    default: 0
  },
  lastPracticeDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

studentSentenceProgressSchema.index({ studentId: 1, sentenceId: 1 }, { unique: true });
studentSentenceProgressSchema.index({ studentId: 1 });

// Virtual: accuracy percentage for this sentence
studentSentenceProgressSchema.methods.getAccuracyPercent = function() {
  if (this.attempts === 0) return 0;
  return Math.round((this.correctCount / this.attempts) * 100);
};

module.exports = mongoose.model('StudentSentenceProgress', studentSentenceProgressSchema);
