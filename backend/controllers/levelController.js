const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const Word = require('../models/Word');
const ExamGroup = require('../models/ExamGroup');

exports.getLevelsByLanguage = async (req, res) => {
  try {
    const { languageId } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?._id;
    const isStudent = req.userType === 'student' || userRole === 'student';

    const levels = await Level.find({ languageId }).sort({ name: 1 }).lean();

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
    const { name, languageId, classesCount, wordsPerClass, examTimeLimit, minPassScore } = req.body;
    if (!name?.trim() || !languageId) {
      return res.status(400).json({ success: false, message: 'Name and language are required' });
    }
    const level = new Level({
      name: name.trim(),
      languageId,
      classesCount: classesCount || 11,
      wordsPerClass: wordsPerClass || 20,
      examTimeLimit: examTimeLimit || 300,
      minPassScore: minPassScore || 70
    });
    await level.save();
    res.status(201).json({ success: true, message: 'Level created', data: { level } });
  } catch (error) {
    console.error('Create level error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const level = await Level.findByIdAndUpdate(id, { name: name?.trim() }, { new: true });
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
    const level = await Level.findById(id);
    if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

    // Get all lessons in this level
    const lessons = await Lesson.find({ levelId: id });

    // Delete all words in all lessons
    for (const lesson of lessons) {
      await Word.deleteMany({ _id: { $in: lesson.wordIds } });
    }

    // Delete lessons and progress
    await Lesson.deleteMany({ levelId: id });
    await Level.findByIdAndDelete(id);

    res.json({ success: true, message: 'Level, classes, and words deleted' });
  } catch (error) {
    console.error('Delete level error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
