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

/**
 * Legacy levels (no moduleType) can appear in Words due to old shared-level data.
 * Deleting from a module should remove the row from that module without destroying other modules' content.
 */
async function resolveScopedLevelDelete(level, lessonType, deleteOptions, {
  softDeleteLevelById,
  softDeleteLessonsForLevelByType
}) {
  if (level.moduleType === lessonType) {
    return softDeleteLevelById(level._id, deleteOptions);
  }

  if (level.moduleType && level.moduleType !== lessonType) {
    return softDeleteLessonsForLevelByType(level._id, lessonType, deleteOptions);
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
  }

  if (targetCount > 0 && otherCount === 0) {
    return softDeleteLevelById(level._id, deleteOptions);
  }

  return softDeleteLessonsForLevelByType(level._id, lessonType, deleteOptions);
}

async function filterLevelsForModule(levels, moduleType) {
  if (!moduleType || moduleType === 'words') {
    const legacyLevels = levels.filter((level) => !level.moduleType);
    if (!legacyLevels.length) return levels;

    const countsById = new Map();
    await Promise.all(
      legacyLevels.map(async (level) => {
        countsById.set(String(level._id), await countLessonsByType(level._id));
      })
    );

    return levels.filter((level) => {
      if (level.moduleType === 'words') return true;
      if (level.moduleType) return level.moduleType === moduleType;
      const counts = countsById.get(String(level._id));
      if (!counts) return true;
      if (counts.total === 0) return true;
      return counts.words > 0;
    });
  }

  return levels;
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
    if (totalLevels === 0 && effectiveModule === 'words') {
      result.push(lang);
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
