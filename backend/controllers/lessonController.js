const Lesson = require('../models/Lesson');
const Word = require('../models/Word');
const StudentLessonProgress = require('../models/StudentLessonProgress');
const Student = require('../models/Student');

// Get all lessons
exports.getAllLessons = async (req, res) => {
  try {
    const { levelId } = req.query;
    const filter = levelId ? { levelId } : {};
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
    const { name, levelId, order, examTimeLimit, minPassScore } = req.body;

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
    const { name, levelId, order, examTimeLimit, minPassScore } = req.body;

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

    await Lesson.findByIdAndDelete(id);
    await StudentLessonProgress.deleteMany({ lessonId: id });

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
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

// Add words to lesson
exports.addWordsToLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { wordIds } = req.body;

    if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'wordIds array is required'
      });
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    const existingIds = new Set(lesson.wordIds.map(w => w.toString()));
    const newIds = wordIds.filter(wid => !existingIds.has(wid));
    lesson.wordIds.push(...newIds);
    await lesson.save();

    res.json({
      success: true,
      message: 'Words added to lesson',
      data: { lesson }
    });
  } catch (error) {
    console.error('Add words to lesson error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Remove word from lesson
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

    res.json({
      success: true,
      message: 'Word removed from lesson',
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

// Get exam words for a lesson
exports.getExamWords = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
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
    let progress = await StudentLessonProgress.findOne({ studentId, lessonId: id });
    if (!progress) {
      progress = new StudentLessonProgress({ studentId, lessonId: id });
    }

    progress.examAttempts += 1;
    if (score > progress.bestExamScore) {
      progress.bestExamScore = score;
    }
    progress.lastExamDate = new Date();

    if (passed && progress.status !== 'passed') {
      progress.status = 'passed';

      // Unlock next lesson
      const nextLesson = await Lesson.findOne({
        levelId: lesson.levelId,
        order: lesson.order + 1
      });

      if (nextLesson) {
        let nextProgress = await StudentLessonProgress.findOne({
          studentId,
          lessonId: nextLesson._id
        });
        if (!nextProgress) {
          nextProgress = new StudentLessonProgress({
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

    // Get all lessons and existing progress
    const allLessons = await Lesson.find().sort({ levelId: 1, order: 1 });
    const progressRecords = await StudentLessonProgress.find({ studentId });
    const progressMap = new Map(progressRecords.map(p => [p.lessonId.toString(), p]));

    // Merge: all lessons must appear, default to locked if no progress
    const progress = allLessons.map(lesson => {
      const existing = progressMap.get(lesson._id.toString());
      if (existing) {
        return {
          _id: existing._id,
          studentId: existing.studentId,
          lessonId: lesson,
          status: existing.status,
          examAttempts: existing.examAttempts,
          bestExamScore: existing.bestExamScore,
          lastExamDate: existing.lastExamDate,
          unlockedAt: existing.unlockedAt
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
        unlockedAt: null
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
        let progress = await StudentLessonProgress.findOne({
          studentId,
          lessonId: firstLesson._id
        });
        if (!progress) {
          progress = new StudentLessonProgress({
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

// Get all student progress (admin)
exports.getAllStudentProgress = async (req, res) => {
  try {
    const students = await Student.find().select('-password').sort({ name: 1 });

    const result = await Promise.all(
      students.map(async (student) => {
        const progress = await StudentLessonProgress.find({ studentId: student._id })
          .populate('lessonId', 'name levelId order');
        return {
          ...student.toObject(),
          progress
        };
      })
    );

    res.json({
      success: true,
      data: { students: result }
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
