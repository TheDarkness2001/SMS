const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const ExamGroup = require('../models/ExamGroup');
const { VALID_LESSON_TYPES, buildModuleTypeFilter, filterLevelsForModule, resolveScopedLevelDelete } = require('../utils/lessonTypes');
const {
  deleteLessonsForLevelByType,
  deleteLessonsForLanguageByType,
  softDeleteLevelById,
  softDeleteLanguageById
} = require('../utils/lessonTypeCleanup');
const { getDeleteOptions, getPrimaryRecycleId } = require('../utils/deleteHelpers');

exports.getLevelsByLanguage = async (req, res) => {
  try {
    const { languageId } = req.params;
    const moduleType = req.query.moduleType || req.query.lessonType;
    const userRole = req.user?.role;
    const userId = req.user?._id;
    const isStudent = req.userType === 'student' || userRole === 'student';

    const filter = { languageId, ...buildModuleTypeFilter(moduleType) };
    let levels = await Level.find(filter).sort({ name: 1 }).lean();
    levels = await filterLevelsForModule(levels, moduleType || 'words');

    // For students, compute per-level unlock status based on their groups
    if (isStudent && userId) {
      const studentGroups = await ExamGroup.find({ students: { $in: [userId, userId.toString()] } }).select('_id');
      const studentGroupIds = studentGroups.map(g => g._id.toString());

      // Fetch all lessons for these levels to check exam unlocks
      const levelIds = levels.map(l => l._id.toString());
      const lessons = await Lesson.find({ levelId: { $in: levelIds } }).select('levelId examUnlockedFor').lean();
      const lessonsByLevel = {};
      lessons.forEach(lesson => {
        const lid = lesson.levelId.toString();
        if (!lessonsByLevel[lid]) lessonsByLevel[lid] = [];
        lessonsByLevel[lid].push(lesson);
      });

      levels.forEach(level => {
        const unlockedFor = (level.practiceUnlockedFor || []).map(g => g.toString());
        // Only check practiceUnlockedFor array (deprecated practiceUnlocked boolean ignored)
        level.practiceUnlockedForMe = unlockedFor.some(gid => studentGroupIds.includes(gid));

        // Check if any lesson in this level has exam unlocked for student's groups
        const levelLessons = lessonsByLevel[level._id.toString()] || [];
        level.examUnlockedForMe = levelLessons.some(lesson =>
          (lesson.examUnlockedFor || []).some(g => studentGroupIds.includes(g.toString()))
        );
      });
    }

    res.json({ success: true, count: levels.length, data: { levels } });
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createLevel = async (req, res) => {
  try {
    const {
      name,
      languageId,
      classesCount,
      wordsPerClass,
      examTimeLimit,
      minPassScore,
      moduleType
    } = req.body;

    if (!name?.trim() || !languageId) {
      return res.status(400).json({ success: false, message: 'Name and language are required' });
    }

    if (!moduleType || !VALID_LESSON_TYPES.includes(moduleType)) {
      return res.status(400).json({
        success: false,
        message: 'moduleType is required (words, sentences, or listening)'
      });
    }

    const normalizedName = name.trim();
    const existing = await Level.findOne({
      languageId,
      name: normalizedName,
      moduleType,
      isDeleted: { $ne: true }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A level named "${normalizedName}" already exists in the ${moduleType} module for this language`
      });
    }

    const level = new Level({
      name: normalizedName,
      languageId,
      moduleType,
      classesCount: classesCount || 11,
      wordsPerClass: wordsPerClass || 20,
      examTimeLimit: examTimeLimit || 300,
      minPassScore: minPassScore || 70
    });
    await level.save();
    res.status(201).json({ success: true, message: 'Level created', data: { level } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Could not create level. If this persists, restart the server so database indexes can update.'
      });
    }
    console.error('Create level error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, classesCount, wordsPerClass, minPassScore } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (classesCount !== undefined) updates.classesCount = Math.max(1, parseInt(classesCount, 10) || 11);
    if (wordsPerClass !== undefined) updates.wordsPerClass = Math.max(1, parseInt(wordsPerClass, 10) || 20);
    if (minPassScore !== undefined) {
      updates.minPassScore = Math.min(100, Math.max(1, parseInt(minPassScore, 10) || 70));
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    const level = await Level.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
    res.json({ success: true, message: 'Level updated', data: { level } });
  } catch (error) {
    console.error('Update level error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.togglePracticeLock = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, message: 'groupId is required' });
    }

    const level = await Level.findById(id);
    if (!level) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }

    // Ensure practiceUnlockedFor is an array
    if (!level.practiceUnlockedFor) {
      level.practiceUnlockedFor = [];
    }

    const groupObjectId = new (require('mongoose').Types.ObjectId)(groupId);
    const isUnlocked = level.practiceUnlockedFor.some(g => g.toString() === groupId);

    if (isUnlocked) {
      level.practiceUnlockedFor = level.practiceUnlockedFor.filter(g => g.toString() !== groupId);
    } else {
      level.practiceUnlockedFor.push(groupObjectId);
    }

    await level.save();
    res.json({
      success: true,
      message: `Practice ${isUnlocked ? 'locked' : 'unlocked'} for group`,
      data: { level }
    });
  } catch (error) {
    console.error('Toggle practice lock error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { lessonType } = req.query;
    const deleteOptions = getDeleteOptions(req);
    const level = await Level.findById(id);
    if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

    if (lessonType) {
      if (!VALID_LESSON_TYPES.includes(lessonType)) {
        return res.status(400).json({ success: false, message: 'Invalid lesson type' });
      }

      const result = await resolveScopedLevelDelete(
        level,
        lessonType,
        deleteOptions,
        {
          softDeleteLevelById,
          softDeleteLessonsForLevelByType: deleteLessonsForLevelByType
        }
      );

      if (result?.retagged) {
        return res.json({
          success: true,
          message: `Level removed from ${lessonType} module`,
          data: {
            retagged: true,
            moduleType: result.moduleType
          }
        });
      }

      return res.json({
        success: true,
        message: `${lessonType} content moved to Recycle Bin`,
        data: {
          deletedLessons: result?.deletedCount ?? result?.deletedLessons ?? 0,
          recycleBinId: result?.levelEntry?._id || getPrimaryRecycleId(result?.recycleEntries),
          movedToRecycleBin: true
        }
      });
    }

    const result = await softDeleteLevelById(id, deleteOptions);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Level not found' });
    }

    res.json({
      success: true,
      message: 'Level moved to Recycle Bin',
      data: {
        deletedLessons: result.deletedLessons,
        recycleBinId: result.levelEntry?._id,
        movedToRecycleBin: true
      }
    });
  } catch (error) {
    console.error('Delete level error:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Server error',
      code: error.code
    });
  }
};
