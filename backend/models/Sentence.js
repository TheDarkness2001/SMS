const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  english: {
    type: String,
    required: [true, 'English sentence is required'],
    trim: true
  },
  uzbek: {
    type: String,
    required: [true, 'Uzbek translation is required'],
    trim: true
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: [true, 'Lesson ID is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

sentenceSchema.index({ lessonId: 1 });

module.exports = mongoose.model('Sentence', sentenceSchema);
