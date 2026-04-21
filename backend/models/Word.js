const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  english: {
    type: String,
    required: [true, 'English word is required'],
    trim: true
  },
  uzbek: {
    type: String,
    required: [true, 'Uzbek translation is required'],
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Word', wordSchema);
