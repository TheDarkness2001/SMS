const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');
const Level = require('../models/Level');
const Language = require('../models/Language');
const Word = require('../models/Word');
const StudentVocabProgress = require('../models/StudentVocabProgress');
const Student = require('../models/Student');
const ClassSchedule = require('../models/ClassSchedule');
const ExamGroup = require('../models/ExamGroup');

// Helper: Check if current time is within class hours (Uzbekistan UTC+5)
const isWithinClassHours = async (studentId) => {
  try {
    const UZBEKISTAN_OFFSET_HOURS = 5;
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const uzbekistanNow = new Date(utcTime + (UZBEKISTAN_OFFSET_HOURS * 60 * 60000));
    const currentDay = uzbekistanNow.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const currentHour = uzbekistanNow.getUTCHours();
    const currentMinute = uzbekistanNow.getUTCMinutes();
    const currentTimeValue = currentHour * 60 + currentMinute;

    // Find student's active schedules for today
    const schedules = await ClassSchedule.find({
      enrolledStudents: studentId,
      scheduledDays: currentDay,
      isActive: true
    });

    for (const schedule of schedules) {
      const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
      const startTimeValue = startHour * 60 + startMinute;
      const endTimeValue = endHour * 60 + endMinute;

      if (currentTimeValue >= startTimeValue && currentTimeValue <= endTimeValue) {
        return { allowed: true, schedule };
      }
    }

    return { allowed: false, reason: 'Exam is only available during your class hours.' };
  } catch (error) {
    return { allowed: false, reason: error.message };
  }
};

// Get all lessons
exports.getAllLessons = async (req, res) => {
  try {
    const { levelId, type } = req.query;
    const filter = levelId ? { levelId } : {};
    // Backward compatibility: lessons without type are treated as 'words'
    if (type === 'sentences') {
      filter.type = 'sentences';
    } else if (type === 'words') {
      filter.$or = [{ type: 'words' }, { type: { $exists: false } }];
    }
    const lessons = await Lesson.find(filter).sort({ levelId: 1, order: 1 });
    res.json({
      success: true,
      count: lessons.length,
      data: { lessons }
    });
  } catch (error) {
    console.error('Get all lessons error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lessons',
      error: error.message
    });
  }
};

// Get single lesson with words
exports.getLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const words = await Word.find({ _id: { $in: lesson.wordIds } });

    res.json({
      success: true,
      data: { lesson, words }
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lesson',
      error: error.message
    });
  }
};

// Create lesson
exports.createLesson = async (req, res) => {
  try {
    const { name, levelId, order, examTimeLimit, minPassScore, maxWords, type } = req.body;

    if (!name || !levelId) {
      return res.status(400).json({
        success: false,
        message: 'Name and levelId are required'
      });
    }

    const lesson = new Lesson({
      name: name.trim(),
      levelId,
      order: order || 1,
      examTimeLimit: examTimeLimit || 300,
      minPassScore: minPassScore || 70,
      maxWords: maxWords || 20,
      type: type || 'words',
      wordIds: []
    });

    await lesson.save();

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: { lesson }
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating lesson',
      error: error.message
    });
  }
};

// Update lesson
exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, levelId, order, examTimeLimit, minPassScore, maxWords, type } = req.body;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    if (name) lesson.name = name.trim();
    if (levelId) lesson.levelId = levelId;
    if (order !== undefined) lesson.order = order;
    if (examTimeLimit !== undefined) lesson.examTimeLimit = examTimeLimit;
    if (minPassScore !== undefined) lesson.minPassScore = minPassScore;
    if (maxWords !== undefined) lesson.maxWords = maxWords;
    if (type !== undefined) lesson.type = type;

    await lesson.save();

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      data: { lesson }
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lesson',
      error: error.message
    });
  }
};

// Toggle exam lock for a lesson per group (staff only)
exports.toggleExamLock = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: 'groupId is required'
      });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const groupObjectId = new mongoose.Types.ObjectId(groupId);
    const isUnlocked = lesson.examUnlockedFor.some(g => g.toString() === groupId);

    if (isUnlocked) {
      lesson.examUnlockedFor = lesson.examUnlockedFor.filter(g => g.toString() !== groupId);
    } else {
      lesson.examUnlockedFor.push(groupObjectId);
    }

    await lesson.save();

    res.json({
      success: true,
      message: `Exam ${isUnlocked ? 'locked' : 'unlocked'} for group successfully`,
      data: { lesson }
    });
  } catch (error) {
    console.error('Toggle exam lock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling exam lock',
      error: error.message
    });
  }
};

// Delete lesson
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Delete all words or sentences in this lesson
    if (lesson.type === 'sentences') {
      const Sentence = require('../models/Sentence');
      await Sentence.deleteMany({ lessonId: id });
    } else {
      await Word.deleteMany({ _id: { $in: lesson.wordIds } });
    }

    await Lesson.findByIdAndDelete(id);
    await StudentVocabProgress.deleteMany({ lessonId: id });

    res.json({
      success: true,
      message: 'Class and its items deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting lesson',
      error: error.message
    });
  }
};

// Remove word from lesson and delete it
exports.removeWordFromLesson = async (req, res) => {
  try {
    const { id, wordId } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    lesson.wordIds = lesson.wordIds.filter(w => w.toString() !== wordId);
    await lesson.save();

    // Delete the word since words cannot be orphaned
    await Word.findByIdAndDelete(wordId);

    res.json({
      success: true,
      message: 'Word removed and deleted',
      data: { lesson }
    });
  } catch (error) {
    console.error('Remove word from lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Auto-generate classes for a level
exports.autoGenerateClasses = async (req, res) => {
  try {
    const { id } = req.params;
    const { count, wordsPerClass, examTimeLimit, minPassScore, type } = req.body;

    const level = await Level.findById(id);
    if (!level) {
      return res.status(404).json({
        success: false,
        message: 'Level not found'
      });
    }

    const classCount = count || level.classesCount || 11;
    const lessonType = type || 'words';
    const typeFilter = lessonType === 'sentences' ? { type: 'sentences' } : { $or: [{ type: 'words' }, { type: { $exists: false } }] };
    const existingLessons = await Lesson.find({ levelId: id, ...typeFilter }).sort({ order: 1 });
    const startOrder = existingLessons.length > 0
      ? Math.max(...existingLessons.map(l => l.order)) + 1
      : 1;

    const createdLessons = [];
    for (let i = 0; i < classCount; i++) {
      const lesson = new Lesson({
        name: `Class ${startOrder + i}`,
        levelId: id,
        order: startOrder + i,
        maxWords: wordsPerClass || level.wordsPerClass || 20,
        examTimeLimit: examTimeLimit || level.examTimeLimit || 300,
        minPassScore: minPassScore || level.minPassScore || 70,
        type: lessonType,
        wordIds: []
      });
      await lesson.save();
      createdLessons.push(lesson);
    }

    res.status(201).json({
      success: true,
      message: `${createdLessons.length} classes generated`,
      data: { lessons: createdLessons }
    });
  } catch (error) {
    console.error('Auto generate classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get exam words for a lesson
exports.getExamWords = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    // Check if student can take exam now (class hours only)
    const timeCheck = await isWithinClassHours(studentId);
    if (!timeCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: timeCheck.reason,
        examAvailable: false
      });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Check if exam is unlocked for any of the student's groups
    const studentGroups = await ExamGroup.find({ students: studentId }).select('_id');
    const studentGroupIds = studentGroups.map(g => g._id.toString());
    const isUnlockedForStudent = lesson.examUnlockedFor.some(g => studentGroupIds.includes(g.toString()));

    if (!isUnlockedForStudent) {
      return res.status(403).json({
        success: false,
        message: 'This exam is currently locked by your teacher.',
        examAvailable: false
      });
    }

    // Check daily retake limit
    const progress = await StudentVocabProgress.findOne({ studentId, lessonId: id });
    if (progress && progress.lastExamDate) {
      const lastExam = new Date(progress.lastExamDate);
      const now = new Date();
      const isSameDay = lastExam.getFullYear() === now.getFullYear() &&
                        lastExam.getMonth() === now.getMonth() &&
                        lastExam.getDate() === now.getDate();
      if (isSameDay) {
        return res.status(403).json({
          success: false,
          message: 'You can only take this exam once per day. Please try again tomorrow.',
          examAvailable: false,
          retryAfter: 'tomorrow'
        });
      }
    }

    if (lesson.wordIds.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No words in this lesson'
      });
    }

    const words = await Word.find({ _id: { $in: lesson.wordIds } });

    const examWords = words.map(word => ({
      id: word._id,
      english: word.english,
      uzbek: word.uzbek,
      direction: Math.random() < 0.5 ? 'en-to-uz' : 'uz-to-en'
    }));

    res.json({
      success: true,
      data: {
        examWords,
        timeLimit: lesson.examTimeLimit,
        minPassScore: lesson.minPassScore
      }
    });
  } catch (error) {
    console.error('Get exam words error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Submit exam
exports.submitExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const studentId = req.user.id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers array is required'
      });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const wordIds = answers.map(a => a.wordId);
    const words = await Word.find({ _id: { $in: wordIds } });
    const wordMap = new Map(words.map(w => [w._id.toString(), w]));

    let correctCount = 0;
    const checkedAnswers = answers.map(ans => {
      const word = wordMap.get(ans.wordId);
      if (!word) return { ...ans, isCorrect: false, correctAnswer: '' };

      const normalizedAnswer = ans.answer.trim().toLowerCase();
      let isCorrect = false;
      let correctAnswer = '';

      if (ans.direction === 'en-to-uz') {
        correctAnswer = word.uzbek;
        isCorrect = normalizedAnswer === word.uzbek.toLowerCase();
      } else {
        correctAnswer = word.english;
        isCorrect = normalizedAnswer === word.english.toLowerCase();
      }

      if (isCorrect) correctCount++;
      return { ...ans, isCorrect, correctAnswer };
    });

    const totalQuestions = answers.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= lesson.minPassScore;

    // Update or create progress record
    let progress = await StudentVocabProgress.findOne({ studentId, lessonId: id });
    if (!progress) {
      progress = new StudentVocabProgress({ studentId, lessonId: id });
    }

    progress.examAttempts += 1;
    if (score > progress.bestExamScore) {
      progress.bestExamScore = score;
    }
    progress.lastExamDate = new Date();
    progress.wordsTotal = totalQuestions;
    progress.wordsMemorized = correctCount;

    if (passed && progress.status !== 'passed') {
      progress.status = 'passed';

      // Unlock next lesson
      const nextLesson = await Lesson.findOne({
        levelId: lesson.levelId,
        order: lesson.order + 1
      });

      if (nextLesson) {
        let nextProgress = await StudentVocabProgress.findOne({
          studentId,
          lessonId: nextLesson._id
        });
        if (!nextProgress) {
          nextProgress = new StudentVocabProgress({
            studentId,
            lessonId: nextLesson._id,
            status: 'available',
            unlockedAt: new Date()
          });
        } else if (nextProgress.status === 'locked') {
          nextProgress.status = 'available';
          nextProgress.unlockedAt = new Date();
        }
        await nextProgress.save();
      }
    }

    await progress.save();

    res.json({
      success: true,
      data: {
        score,
        correctCount,
        totalQuestions,
        passed,
        checkedAnswers,
        minPassScore: lesson.minPassScore
      }
    });
  } catch (error) {
    console.error('Submit exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting exam',
      error: error.message
    });
  }
};

// Get student lesson progress
exports.getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student's groups for exam unlock checking
    const studentGroups = await ExamGroup.find({ students: studentId }).select('_id');
    const studentGroupIds = studentGroups.map(g => g._id.toString());

    // Get all levels for practiceUnlocked info
    const allLevels = await Level.find().select('_id practiceUnlocked practiceUnlockedFor');
    const levelMap = new Map(allLevels.map(l => {
      const levelData = l.toObject ? l.toObject() : l;
      // Compute effective practice unlock for this student
      const unlockedFor = (levelData.practiceUnlockedFor || []).map(g => g.toString());
      levelData.isPracticeUnlocked = levelData.practiceUnlocked === true ||
        unlockedFor.some(gid => studentGroupIds.includes(gid));
      return [l._id.toString(), levelData];
    }));

    // Get all lessons and existing progress
    const allLessons = await Lesson.find().sort({ levelId: 1, order: 1 });
    const progressRecords = await StudentVocabProgress.find({ studentId });
    const progressMap = new Map(progressRecords.map(p => [p.lessonId.toString(), p]));

    // Merge: all lessons must appear, default to locked if no progress
    const progress = allLessons.map(lesson => {
      const existing = progressMap.get(lesson._id.toString());
      const examUnlocked = lesson.examUnlockedFor.some(g => studentGroupIds.includes(g.toString()));
      const level = levelMap.get(lesson.levelId.toString());
      if (existing) {
        return {
          _id: existing._id,
          studentId: existing.studentId,
          lessonId: lesson,
          status: existing.status,
          examAttempts: existing.examAttempts,
          bestExamScore: existing.bestExamScore,
          lastExamDate: existing.lastExamDate,
          unlockedAt: existing.unlockedAt,
          examUnlocked,
          practiceUnlocked: level?.isPracticeUnlocked || false
        };
      }
      return {
        _id: `${studentId}-${lesson._id}`,
        studentId,
        lessonId: lesson,
        status: 'locked',
        examAttempts: 0,
        bestExamScore: 0,
        lastExamDate: null,
        unlockedAt: null,
        examUnlocked,
        practiceUnlocked: level?.isPracticeUnlocked || false
      };
    });

    res.json({
      success: true,
      data: { progress }
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Initialize student progress (unlock first lesson of each level)
exports.initStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.id;

    const levelIds = await Lesson.distinct('levelId');
    const unlockedLessons = [];

    for (const levelId of levelIds) {
      const firstLesson = await Lesson.findOne({ levelId }).sort({ order: 1 });
      if (firstLesson) {
        let progress = await StudentVocabProgress.findOne({
          studentId,
          lessonId: firstLesson._id
        });
        if (!progress) {
          progress = new StudentVocabProgress({
            studentId,
            lessonId: firstLesson._id,
            status: 'available',
            unlockedAt: new Date()
          });
          await progress.save();
          unlockedLessons.push(firstLesson.name);
        }
      }
    }

    res.json({
      success: true,
      message: 'Student progress initialized',
      data: { unlockedLessons }
    });
  } catch (error) {
    console.error('Init student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all student progress grouped by ExamGroup (admin)
exports.getAllStudentProgress = async (req, res) => {
  try {
    // Fetch all active exam groups with populated students
    const examGroups = await ExamGroup.find({ status: 'active' })
      .populate('students', '-password')
      .sort({ groupName: 1 });

    // Build a set of all students already in groups
    const groupedStudentIds = new Set();
    const groupsData = await Promise.all(
      examGroups.map(async (group) => {
        const studentsWithProgress = await Promise.all(
          (group.students || []).map(async (student) => {
            groupedStudentIds.add(student._id.toString());
            const progress = await StudentVocabProgress.find({ studentId: student._id })
              .populate('lessonId', 'name levelId order');
            return {
              ...student.toObject(),
              progress
            };
          })
        );

        const totalAttempts = studentsWithProgress.reduce((sum, s) =>
          sum + (s.progress?.reduce((pSum, p) => pSum + (p.examAttempts || 0), 0) || 0), 0);
        const totalCorrect = studentsWithProgress.reduce((sum, s) =>
          sum + (s.progress?.reduce((pSum, p) => pSum + (p.wordsMemorized || 0), 0) || 0), 0);
        const avgAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

        return {
          groupId: group._id,
          groupName: group.groupName,
          subjectName: group.subjectName || '',
          studentCount: studentsWithProgress.length,
          avgAccuracy,
          students: studentsWithProgress
        };
      })
    );

    // Find unassigned students (not in any active group)
    const unassignedStudents = await Student.find({
      _id: { $nin: Array.from(groupedStudentIds).map(id => new mongoose.Types.ObjectId(id)) }
    }).select('-password').sort({ name: 1 });

    const unassignedWithProgress = await Promise.all(
      unassignedStudents.map(async (student) => {
        const progress = await StudentVocabProgress.find({ studentId: student._id })
          .populate('lessonId', 'name levelId order');
        return {
          ...student.toObject(),
          progress
        };
      })
    );

    const result = {
      groups: groupsData,
      unassigned: {
        groupName: 'Unassigned',
        studentCount: unassignedWithProgress.length,
        students: unassignedWithProgress
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get all student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get aggregated progress per level and language for a student
exports.getStudentAggregatedProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { languageId, levelId } = req.query;

    // Build lesson filter
    const lessonFilter = {};
    if (levelId) {
      lessonFilter.levelId = levelId;
    } else if (languageId) {
      const levels = await Level.find({ languageId }).select('_id');
      const levelIds = levels.map(l => l._id);
      lessonFilter.levelId = { $in: levelIds };
    }

    const allLessons = await Lesson.find(lessonFilter).sort({ levelId: 1, order: 1 });
    const progressRecords = await StudentVocabProgress.find({ studentId });
    const progressMap = new Map(progressRecords.map(p => [p.lessonId.toString(), p]));

    // Group by level
    const levelMap = new Map();
    for (const lesson of allLessons) {
      const lvlId = lesson.levelId.toString();
      if (!levelMap.has(lvlId)) {
        levelMap.set(lvlId, []);
      }
      const existing = progressMap.get(lesson._id.toString());
      levelMap.get(lvlId).push({
        lessonId: lesson,
        status: existing ? existing.status : 'locked',
        examAttempts: existing ? existing.examAttempts : 0,
        bestExamScore: existing ? existing.bestExamScore : 0,
        wordsMemorized: existing ? existing.wordsMemorized : 0,
        wordsTotal: lesson.wordIds.length,
        lastExamDate: existing ? existing.lastExamDate : null
      });
    }

    // Build aggregated result
    const levelIds = [...levelMap.keys()];
    const levels = await Level.find({ _id: { $in: levelIds } });
    const levelDetails = await Promise.all(levels.map(async (lvl) => {
      const classes = levelMap.get(lvl._id.toString()) || [];
      const totalWords = classes.reduce((sum, c) => sum + c.wordsTotal, 0);
      const memorizedWords = classes.reduce((sum, c) => sum + c.wordsMemorized, 0);
      const passedClasses = classes.filter(c => c.status === 'passed').length;
      const availableClasses = classes.filter(c => c.status === 'available').length;
      const lockedClasses = classes.filter(c => c.status === 'locked').length;

      return {
        levelId: lvl._id,
        levelName: lvl.name,
        languageId: lvl.languageId,
        totalClasses: classes.length,
        passedClasses,
        availableClasses,
        lockedClasses,
        totalWords,
        memorizedWords,
        memorizationPercent: totalWords > 0 ? Math.round((memorizedWords / totalWords) * 100) : 0,
        classes
      };
    }));

    // Group by language
    const languageMap = new Map();
    for (const lvl of levelDetails) {
      const langId = lvl.languageId.toString();
      if (!languageMap.has(langId)) {
        languageMap.set(langId, []);
      }
      languageMap.get(langId).push(lvl);
    }

    const languageIds = [...languageMap.keys()];
    const langs = await Language.find({ _id: { $in: languageIds } });
    const result = langs.map(lang => {
      const lvls = languageMap.get(lang._id.toString()) || [];
      const totalWords = lvls.reduce((sum, l) => sum + l.totalWords, 0);
      const memorizedWords = lvls.reduce((sum, l) => sum + l.memorizedWords, 0);
      const totalClasses = lvls.reduce((sum, l) => sum + l.totalClasses, 0);
      const passedClasses = lvls.reduce((sum, l) => sum + l.passedClasses, 0);

      return {
        languageId: lang._id,
        languageName: lang.name,
        totalLevels: lvls.length,
        totalClasses,
        passedClasses,
        totalWords,
        memorizedWords,
        memorizationPercent: totalWords > 0 ? Math.round((memorizedWords / totalWords) * 100) : 0,
        levels: lvls
      };
    });

    res.json({
      success: true,
      data: { progress: result }
    });
  } catch (error) {
    console.error('Get aggregated progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update practice stats
exports.updatePracticeStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { lessonId, isCorrect } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'lessonId is required'
      });
    }

    let progress = await StudentVocabProgress.findOne({ studentId, lessonId });
    if (!progress) {
      progress = new StudentVocabProgress({ studentId, lessonId });
    }

    progress.practiceAttempts += 1;
    if (isCorrect) {
      progress.practiceCorrect += 1;
    }
    progress.lastPracticeDate = new Date();

    await progress.save();

    res.json({
      success: true,
      data: {
        practiceAttempts: progress.practiceAttempts,
        practiceCorrect: progress.practiceCorrect
      }
    });
  } catch (error) {
    console.error('Update practice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
