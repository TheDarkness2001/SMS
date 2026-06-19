const VALID_LESSON_TYPES = ['words', 'sentences', 'listening'];

function buildModuleTypeFilter(moduleType) {
  if (!moduleType || !VALID_LESSON_TYPES.includes(moduleType)) {
    return {};
  }

  if (moduleType === 'words') {
    return {
      $or: [
        { moduleType: 'words' },
        { moduleType: { $exists: false } },
        { moduleType: null }
      ]
    };
  }

  return { moduleType };
}

module.exports = {
  VALID_LESSON_TYPES,
  buildModuleTypeFilter
};
