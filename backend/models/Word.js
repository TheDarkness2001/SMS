const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  english: {
    type: String,
    required: [true, 'English word is required'],
    trim: true
  },
  pronunciation: {
    type: String,
    trim: true,
    default: ''
  },
  uzbek: {
    type: String,
    required: [true, 'Uzbek translation is required'],
    trim: true
  },
  shortUzbek: {
    type: String,
    trim: true,
    default: ''
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: [true, 'Class (lesson) is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

wordSchema.index({ lessonId: 1 });

module.exports = mongoose.model('Word', wordSchema);
