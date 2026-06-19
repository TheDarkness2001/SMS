const {
  VALID_LESSON_TYPES,
  softDeleteLessonsForLevelByType,
  softDeleteLessonsForLanguageByType,
  softDeleteLevelById,
  softDeleteLanguageById,
  softDeleteLessonById
} = require('../services/recycleBinService');

module.exports = {
  VALID_LESSON_TYPES,
  deleteLessonsForLevelByType: softDeleteLessonsForLevelByType,
  deleteLessonsForLanguageByType: softDeleteLessonsForLanguageByType,
  deleteAllLessonsForLevel: (levelId, options) => softDeleteLevelById(levelId, options).then((r) => r?.deletedLessons || 0),
  deleteAllLessonsForLanguage: (languageId, options) => softDeleteLanguageById(languageId, options),
  deleteLessonContent: softDeleteLessonById,
  softDeleteLevelById,
  softDeleteLanguageById,
  softDeleteLessonById
};
