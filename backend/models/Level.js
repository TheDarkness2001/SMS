const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Level name is required'],
    trim: true
  },
  languageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Language',
    required: true
  },
  // Configurable defaults for this level
  classesCount: {
    type: Number,
    default: 11,
    min: 1
  },
  wordsPerClass: {
    type: Number,
    default: 20,
    min: 1
  },
  examTimeLimit: {
    type: Number,
    default: 300,
    min: 30
  },
  minPassScore: {
    type: Number,
    default: 70,
    min: 1,
    max: 100
  },
  practiceUnlocked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

levelSchema.index({ languageId: 1, name: 1 });

module.exports = mongoose.model('Level', levelSchema);
