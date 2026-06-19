const VALID_LESSON_TYPES = ['words', 'sentences', 'listening'];

function buildModuleTypeFilter(moduleType) {
  if (!moduleType || !VALID_LESSON_TYPES.includes(moduleType)) {
    return {};
  }

  return {
    $or: [
      { moduleType },
      { moduleType: { $exists: false } },
      { moduleType: null }
    ]
  };
}

function buildLessonTypeFilter(lessonType) {
  if (lessonType === 'sentences') return { type: 'sentences' };
  if (lessonType === 'listening') return { type: 'listening' };
  return { $or: [{ type: 'words' }, { type: { $exists: false } }] };
}

async function countLessonsByType(levelId) {
  const Lesson = require('../models/Lesson');
  const [words, sentences, listening, total] = await Promise.all([
    Lesson.countDocuments({ levelId, ...buildLessonTypeFilter('words') }),
    Lesson.countDocuments({ levelId, type: 'sentences' }),
    Lesson.countDocuments({ levelId, type: 'listening' }),
    Lesson.countDocuments({ levelId })
  ]);
  return { words, sentences, listening, total };
}

function inferModuleTypeFromCounts(counts) {
  const types = VALID_LESSON_TYPES.filter((type) => counts[type] > 0);
  return types.length === 1 ? types[0] : null;
}

async function finalizeLevelAfterModuleDelete(levelId, lessonType, deleteOptions, { softDeleteLevelById }) {
  const Level = require('../models/Level');
  const level = await Level.findById(levelId);
  if (!level) return { retagged: true };

  const counts = await countLessonsByType(levelId);
  const targetCount = counts[lessonType] || 0;
  const otherCount = counts.total - targetCount;

  if (counts.total === 0) {
    return softDeleteLevelById(levelId, deleteOptions);
  }

  if (targetCount === 0 && otherCount > 0) {
    const inferred = inferModuleTypeFromCounts(counts);
    if (inferred) {
      level.moduleType = inferred;
      await level.save();
      return { retagged: true, moduleType: inferred };
    }
    return { retagged: true, removedFromModule: true };
  }

  return null;
}

async function resolveScopedLevelDelete(level, lessonType, deleteOptions, {
  softDeleteLevelById,
  softDeleteLessonsForLevelByType
}) {
  if (level.moduleType === lessonType) {
    return softDeleteLevelById(level._id, deleteOptions);
  }

  if (level.moduleType && level.moduleType !== lessonType) {
    await softDeleteLessonsForLevelByType(level._id, lessonType, deleteOptions);
    return finalizeLevelAfterModuleDelete(level._id, lessonType, deleteOptions, { softDeleteLevelById });
  }

  const counts = await countLessonsByType(level._id);
  const targetCount = counts[lessonType] || 0;
  const otherCount = counts.total - targetCount;

  if (targetCount === 0 && otherCount === 0) {
    return softDeleteLevelById(level._id, deleteOptions);
  }

  if (targetCount === 0 && otherCount > 0) {
    const inferred = inferModuleTypeFromCounts(counts);
    if (inferred) {
      level.moduleType = inferred;
      await level.save();
      return { retagged: true, moduleType: inferred };
    }
    return { retagged: true, removedFromModule: true };
  }

  if (targetCount > 0 && otherCount === 0) {
    return softDeleteLevelById(level._id, deleteOptions);
  }

  await softDeleteLessonsForLevelByType(level._id, lessonType, deleteOptions);
  const finalized = await finalizeLevelAfterModuleDelete(level._id, lessonType, deleteOptions, { softDeleteLevelById });
  return finalized || { removedFromModule: true };
}

async function filterLevelsForModule(levels, moduleType) {
  const effectiveModule = moduleType || 'words';
  const legacyLevels = levels.filter((level) => !level.moduleType);

  if (!legacyLevels.length) {
    return levels.filter((level) => level.moduleType === effectiveModule);
  }

  const countsById = new Map();
  await Promise.all(
    legacyLevels.map(async (level) => {
      countsById.set(String(level._id), await countLessonsByType(level._id));
    })
  );

  return levels.filter((level) => {
    if (level.moduleType === effectiveModule) return true;
    if (level.moduleType) return false;

    const counts = countsById.get(String(level._id));
    if (!counts || counts.total === 0) return effectiveModule === 'words';
    return counts[effectiveModule] > 0;
  });
}

async function filterLanguagesForModule(languages, moduleType) {
  const Level = require('../models/Level');
  const effectiveModule = moduleType || 'words';
  const result = [];

  for (const lang of languages) {
    if (lang.moduleType === effectiveModule) {
      result.push(lang);
      continue;
    }
    if (lang.moduleType && lang.moduleType !== effectiveModule) {
      continue;
    }

    const levels = await Level.find({ languageId: lang._id, ...buildModuleTypeFilter(effectiveModule) }).lean();
    const filteredLevels = await filterLevelsForModule(levels, effectiveModule);
    if (filteredLevels.length > 0) {
      result.push(lang);
      continue;
    }

    const totalLevels = await Level.countDocuments({ languageId: lang._id });
    if (totalLevels === 0) {
      if (lang.moduleType === effectiveModule || (!lang.moduleType && effectiveModule === 'words')) {
        result.push(lang);
      }
    }
  }

  return result;
}

module.exports = {
  VALID_LESSON_TYPES,
  buildModuleTypeFilter,
  buildLessonTypeFilter,
  countLessonsByType,
  inferModuleTypeFromCounts,
  resolveScopedLevelDelete,
  filterLevelsForModule,
  filterLanguagesForModule
};
