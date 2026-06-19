const mongoose = require('mongoose');
const softDeletePlugin = require('../plugins/softDeletePlugin');

const languageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Language name is required'],
    trim: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

languageSchema.plugin(softDeletePlugin);

module.exports = mongoose.model('Language', languageSchema);
