const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
