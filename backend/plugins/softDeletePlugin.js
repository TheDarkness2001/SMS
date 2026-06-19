const NOT_DELETED = { isDeleted: { $ne: true } };

function applyNotDeletedFilter(query) {
  const options = query.getOptions?.() || {};
  if (options.includeDeleted) return;
  const current = query.getQuery();
  if (current.isDeleted !== undefined) return;
  query.where(NOT_DELETED);
}

function softDeletePlugin(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null }
  });

  schema.pre(/^find/, function preFind(next) {
    applyNotDeletedFilter(this);
    next();
  });

  schema.pre('countDocuments', function preCount(next) {
    applyNotDeletedFilter(this);
    next();
  });

  schema.pre('aggregate', function preAggregate(next) {
    const options = this.options || {};
    if (options.includeDeleted) return next();
    const pipeline = this.pipeline();
    const firstMatch = pipeline[0]?.$match;
    if (firstMatch && Object.prototype.hasOwnProperty.call(firstMatch, 'isDeleted')) {
      return next();
    }
    this.pipeline().unshift({ $match: NOT_DELETED });
    next();
  });

  schema.pre('save', async function preSaveSnapshot() {
    if (this.isNew || !this.isModified()) return;
    if (this.isModified('isDeleted') && this.isDeleted) return;
    try {
      const { snapshotBeforeUpdate } = require('../services/recycleBinService');
      const Model = this.constructor;
      const previous = await Model.findById(this._id).setOptions({ includeDeleted: true }).lean();
      if (previous) {
        await snapshotBeforeUpdate(Model, previous, this.deletedBy || 'system');
      }
    } catch (err) {
      console.error('Snapshot before update failed:', err.message);
    }
  });

  schema.statics.findIncludingDeleted = function findIncludingDeleted(filter = {}) {
    return this.find(filter).setOptions({ includeDeleted: true });
  };

  schema.statics.findByIdIncludingDeleted = function findByIdIncludingDeleted(id) {
    return this.findById(id).setOptions({ includeDeleted: true });
  };
}

module.exports = softDeletePlugin;
module.exports.NOT_DELETED = NOT_DELETED;
