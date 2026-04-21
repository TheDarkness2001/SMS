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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

levelSchema.index({ languageId: 1, name: 1 });

module.exports = mongoose.model('Level', levelSchema);
