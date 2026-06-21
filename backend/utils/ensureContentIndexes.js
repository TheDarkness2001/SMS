const Language = require('../models/Language');
const Level = require('../models/Level');

async function dropConflictingIndexes(collection, label) {
  const indexes = await collection.indexes();

  for (const index of indexes) {
    if (!index.unique || index.name === '_id_') continue;

    const key = index.key || {};
    const keyNames = Object.keys(key);
    const hasModuleType = Object.prototype.hasOwnProperty.call(key, 'moduleType');
    const isLanguageNameOnly = keyNames.length === 1 && key.name === 1;
    const isLevelWithoutModule =
      key.languageId === 1 && key.name === 1 && !hasModuleType;
    const isCompoundWithoutPartial =
      key.name && hasModuleType && !index.partialFilterExpression;

    if (isLanguageNameOnly || isLevelWithoutModule || isCompoundWithoutPartial) {
      await collection.dropIndex(index.name);
      console.log(`Dropped ${label} index: ${index.name}`);
    }
  }
}

async function ensureContentIndexes() {
  await dropConflictingIndexes(Language.collection, 'language');
  await dropConflictingIndexes(Level.collection, 'level');
  await Language.syncIndexes();
  await Level.syncIndexes();
  console.log('Content module indexes synced (languages/levels per moduleType)');
}

module.exports = ensureContentIndexes;
