const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  sourceCollection: {
    type: String,
    required: true,
    index: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  version: {
    type: Number,
    default: 1
  },
  action: {
    type: String,
    enum: ['update', 'delete', 'restore', 'purge'],
    default: 'update'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdBy: { type: String, default: 'system' }
});

snapshotSchema.index({ sourceCollection: 1, sourceId: 1, version: -1 });

module.exports = mongoose.model('Snapshot', snapshotSchema);
