const mongoose = require('mongoose');

const studentVideoProgressSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  videoLessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoLesson',
    required: true
  },
  watchPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  lastTimestamp: {
    type: Number,
    default: 0
  },
  rewatchCount: {
    type: Number,
    default: 0
  },
  totalWatchTime: {
    type: Number,
    default: 0
  },
  lastAccessAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

studentVideoProgressSchema.index({ studentId: 1, videoLessonId: 1 }, { unique: true });
studentVideoProgressSchema.index({ videoLessonId: 1 });

module.exports = mongoose.model('StudentVideoProgress', studentVideoProgressSchema);
