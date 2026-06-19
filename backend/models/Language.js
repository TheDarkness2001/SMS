const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDeletePlugin');

const languageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Language name is required'],
    trim: true
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

languageSchema.index({ name: 1, moduleType: 1 }, { unique: true });

languageSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Language', languageSchema);
