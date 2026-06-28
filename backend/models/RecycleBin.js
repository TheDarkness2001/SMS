const mongoose = require('mongoose');

const recycleBinSchema = new mongoose.Schema({
  originalId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  collectionName: {
    type: String,
    required: true,
    index: true
  },
  displayName: { type: String, default: '' },
  displayType: { type: String, default: '' },
  languageName: { type: String, default: '' },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  deletedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  deletedBy: { type: String, default: 'system' },
  cascadeGroupId: { type: String, default: null, index: true },
  parentRecycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecycleBin',
    default: null
  },
  restoredAt: { type: Date, default: null },
  restoredBy: { type: String, default: null },
  purgedAt: { type: Date, default: null },
  purgedBy: { type: String, default: null },
  isImportant: { type: Boolean, default: false, index: true }
});

recycleBinSchema.index({ restoredAt: 1, purgedAt: 1 });

module.exports = mongoose.model('RecycleBin', recycleBinSchema);
