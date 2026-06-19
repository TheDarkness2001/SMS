const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDeletePlugin');

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
  // Per-group practice unlock: which ExamGroups can practice this level
  practiceUnlockedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamGroup'
  }],
  // DEPRECATED: kept for backward compatibility during migration
  practiceUnlocked: {
    type: Boolean,
    default: false
  },
  moduleType: {
    type: String,
    enum: [null, 'words', 'sentences', 'listening'],
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

levelSchema.index({ languageId: 1, name: 1 });
levelSchema.index({ languageId: 1, name: 1, moduleType: 1 }, { unique: true });

levelSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Level', levelSchema);
