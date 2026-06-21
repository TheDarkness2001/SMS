const Language = require('../models/Language');
const {
  VALID_LESSON_TYPES,
  buildModuleTypeFilter,
  filterLanguagesForModule
} = require('../utils/lessonTypes');
const ensureContentIndexes = require('../utils/ensureContentIndexes');
const {
  resolveScopedLanguageDelete,
  softDeleteLanguageById
} = require('../services/recycleBinService');
const { getDeleteOptions, getPrimaryRecycleId } = require('../utils/deleteHelpers');

function sendCreateLanguageError(res, error) {
  if (error.code === 11000) {
    const dupValue = error.keyValue?.name || 'this name';
    return res.status(409).json({
      success: false,
      message: `Could not create "${dupValue}". A legacy database index may still be blocking separate modules. Restart the server once, then try again.`,
      code: 'DUPLICATE_LANGUAGE'
    });
  }

  const message = error.message || 'Server error while creating language';
  console.error('Create language error:', error);
  return res.status(500).json({ success: false, message, error: message });
}

exports.getAllLanguages = async (req, res) => {
  try {
    const moduleType = req.query.moduleType || req.query.lessonType;
    const filter = buildModuleTypeFilter(moduleType);
    let languages = await Language.find(filter).sort({ name: 1 }).lean();
    languages = await filterLanguagesForModule(languages, moduleType || 'words');
    res.json({ success: true, count: languages.length, data: { languages } });
  } catch (error) {
    console.error('Get all languages error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createLanguage = async (req, res) => {
  try {
    const { name, moduleType } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Language name is required' });
    }
    if (!moduleType || !VALID_LESSON_TYPES.includes(moduleType)) {
      return res.status(400).json({
        success: false,
        message: 'moduleType is required (words, sentences, or listening)'
      });
    }

    const normalizedName = name.trim();
    const existing = await Language.findOne({
      name: normalizedName,
      moduleType,
      isDeleted: { $ne: true }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A language named "${normalizedName}" already exists in the ${moduleType} module`
      });
    }

    const deletedMatch = await Language.findOne({ name: normalizedName, moduleType })
      .setOptions({ includeDeleted: true });
    if (deletedMatch?.isDeleted) {
      deletedMatch.isDeleted = false;
      deletedMatch.deletedAt = null;
      deletedMatch.deletedBy = null;
      await deletedMatch.save();
      return res.status(201).json({
        success: true,
        message: 'Language restored',
        data: { language: deletedMatch, restored: true }
      });
    }

    const language = new Language({ name: normalizedName, moduleType });
    await language.save();
    res.status(201).json({ success: true, message: 'Language created', data: { language } });
  } catch (error) {
    if (error.code === 11000) {
      try {
        await ensureContentIndexes();
        const normalizedName = req.body.name?.trim();
        const moduleType = req.body.moduleType;
        const language = new Language({ name: normalizedName, moduleType });
        await language.save();
        return res.status(201).json({ success: true, message: 'Language created', data: { language } });
      } catch (retryError) {
        return sendCreateLanguageError(res, retryError);
      }
    }
    return sendCreateLanguageError(res, error);
  }
};

exports.updateLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const language = await Language.findByIdAndUpdate(id, { name: name?.trim() }, { new: true });
    if (!language) return res.status(404).json({ success: false, message: 'Language not found' });
    res.json({ success: true, message: 'Language updated', data: { language } });
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const { lessonType } = req.query;
    const deleteOptions = getDeleteOptions(req);
    const language = await Language.findById(id);
    if (!language) return res.status(404).json({ success: false, message: 'Language not found' });

    if (lessonType) {
      if (!VALID_LESSON_TYPES.includes(lessonType)) {
        return res.status(400).json({ success: false, message: 'Invalid lesson type' });
      }

      const result = await resolveScopedLanguageDelete(language, lessonType, deleteOptions);

      if (result?.retagged) {
        return res.json({
          success: true,
          message: `Language removed from ${lessonType} module`,
          data: {
            retagged: true,
            moduleType: result.moduleType || null
          }
        });
      }

      return res.json({
        success: true,
        message: `${lessonType} content moved to Recycle Bin`,
        data: {
          deletedLessons: result?.deletedCount ?? result?.deletedLevels ?? 0,
          recycleBinId: result?.languageEntry?._id || getPrimaryRecycleId(result?.recycleEntries),
          movedToRecycleBin: true,
          removedFromModule: Boolean(result?.removedFromModule)
        }
      });
    }

    const result = await softDeleteLanguageById(id, deleteOptions);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Language not found' });
    }

    res.json({
      success: true,
      message: 'Language moved to Recycle Bin',
      data: {
        recycleBinId: result.languageEntry?._id,
        movedToRecycleBin: true
      }
    });
  } catch (error) {
    console.error('Delete language error:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Server error',
      code: error.code
    });
  }
};
