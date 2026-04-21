const mongoose = require('mongoose');

const homeworkProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  enToUzCorrect: {
    type: Number,
    default: 0
  },
  enToUzTotal: {
    type: Number,
    default: 0
  },
  uzToEnCorrect: {
    type: Number,
    default: 0
  },
  uzToEnTotal: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Calculate accuracy percentage
homeworkProgressSchema.methods.getAccuracy = function() {
  if (this.totalAttempts === 0) return 0;
  return Math.round((this.correctAnswers / this.totalAttempts) * 100);
};

// Get direction-specific accuracy
homeworkProgressSchema.methods.getEnToUzAccuracy = function() {
  if (this.enToUzTotal === 0) return 0;
  return Math.round((this.enToUzCorrect / this.enToUzTotal) * 100);
};

homeworkProgressSchema.methods.getUzToEnAccuracy = function() {
  if (this.uzToEnTotal === 0) return 0;
  return Math.round((this.uzToEnCorrect / this.uzToEnTotal) * 100);
};

module.exports = mongoose.model('HomeworkProgress', homeworkProgressSchema);
