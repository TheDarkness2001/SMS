const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true
  },
  levelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level',
    required: [true, 'Level is required']
  },
  order: {
    type: Number,
    required: [true, 'Order is required'],
    default: 1
  },
  wordIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word'
  }],
  maxWords: {
    type: Number,
    default: 20,
    min: 1
  },
  type: {
    type: String,
    enum: ['words', 'sentences'],
    default: 'words'
  },
  examTimeLimit: {
    type: Number,
    default: 300
  },
  minPassScore: {
    type: Number,
    default: 70
  },
  examUnlockedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamGroup'
  }],
  directionMode: {
    type: String,
    enum: ['mixed', 'en-to-uz', 'uz-to-en'],
    default: 'mixed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

lessonSchema.index({ levelId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
