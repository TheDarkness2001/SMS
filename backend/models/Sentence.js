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
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

sentenceSchema.index({ category: 1 });

module.exports = mongoose.model('Sentence', sentenceSchema);
