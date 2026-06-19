const RecycleBin = require('../models/RecycleBin');
const Snapshot = require('../models/Snapshot');
const {
  restoreRecycleEntry,
  purgeRecycleEntry
} = require('../services/recycleBinService');
const { getDeleteOptions } = require('../utils/deleteHelpers');

exports.listRecycleBin = async (req, res) => {
  try {
    const { includePurged } = req.query;
    const filter = { restoredAt: null };
    if (includePurged !== 'true') {
      filter.purgedAt = null;
    }

    const items = await RecycleBin.find(filter).sort({ deletedAt: -1 }).lean();
    res.json({ success: true, count: items.length, data: { items } });
  } catch (error) {
    console.error('List recycle bin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.restoreItem = async (req, res) => {
  try {
    const result = await restoreRecycleEntry(req.params.id, getDeleteOptions(req));
    res.json({
      success: true,
      message: 'Item restored successfully',
      data: {
        recycleBinId: req.params.id,
        originalId: result.document?._id,
        collectionName: result.entry.collectionName
      }
    });
  } catch (error) {
    console.error('Restore recycle bin item error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error',
      code: error.code
    });
  }
};

exports.purgeItem = async (req, res) => {
  try {
    const { confirmText } = req.body;
    if (confirmText !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Type DELETE to permanently remove this item from the Recycle Bin view',
        code: 'CONFIRMATION_REQUIRED'
      });
    }

    const entry = await purgeRecycleEntry(req.params.id, getDeleteOptions(req));
    res.json({
      success: true,
      message: 'Item permanently removed from Recycle Bin (snapshot retained)',
      data: { recycleBinId: entry._id }
    });
  } catch (error) {
    console.error('Purge recycle bin item error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

exports.listSnapshots = async (req, res) => {
  try {
    const { sourceCollection, sourceId } = req.query;
    const filter = {};
    if (sourceCollection) filter.sourceCollection = sourceCollection;
    if (sourceId) filter.sourceId = sourceId;

    const snapshots = await Snapshot.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, count: snapshots.length, data: { snapshots } });
  } catch (error) {
    console.error('List snapshots error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
