const Language = require('../models/Language');
const Level = require('../models/Level');

async function dropLegacyUniqueIndexes(collection, label) {
  const indexes = await collection.indexes();

  for (const index of indexes) {
    if (!index.unique) continue;

    const keys = Object.keys(index.key || {});
    const isLanguageNameOnly = keys.length === 1 && index.key.name === 1;
    const isLevelWithoutModule =
      index.key.languageId === 1 &&
      index.key.name === 1 &&
      !Object.prototype.hasOwnProperty.call(index.key, 'moduleType');

    if (isLanguageNameOnly || isLevelWithoutModule) {
      await collection.dropIndex(index.name);
      console.log(`Dropped legacy ${label} index: ${index.name}`);
    }
  }
}

async function ensureContentIndexes() {
  await dropLegacyUniqueIndexes(Language.collection, 'language');
  await dropLegacyUniqueIndexes(Level.collection, 'level');
  await Language.syncIndexes();
  await Level.syncIndexes();
  console.log('Content module indexes synced (languages/levels per moduleType)');
}

module.exports = ensureContentIndexes;
