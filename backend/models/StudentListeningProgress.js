const mongoose = require('mongoose');

const studentListeningProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  listeningId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ListeningExercise',
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  bestAccuracy: {
    type: Number,
    default: 0
  },
  lastAccuracy: {
    type: Number,
    default: 0
  },
  lastPracticeDate: {
    type: Date
  }
});

studentListeningProgressSchema.index({ studentId: 1, listeningId: 1 }, { unique: true });

module.exports = mongoose.model('StudentListeningProgress', studentListeningProgressSchema);
