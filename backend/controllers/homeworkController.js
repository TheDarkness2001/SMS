const mongoose = require('mongoose');
const Word = require('../models/Word');
const Lesson = require('../models/Lesson');
const Level = require('../models/Level');
const Language = require('../models/Language');
const HomeworkProgress = require('../models/HomeworkProgress');
const Student = require('../models/Student');
const ExamGroup = require('../models/ExamGroup');
const StudentVocabProgress = require('../models/StudentVocabProgress');
const StudentSentenceProgress = require('../models/StudentSentenceProgress');
const Sentence = require('../models/Sentence');

// Get random word for practice
exports.getRandomWord = async (req, res) => {
  try {
    const { lessonId, levelId, mode } = req.query;
    let filter = {};

    if (lessonId) {
      filter = { lessonId: new mongoose.Types.ObjectId(lessonId) };
    } else if (levelId) {
      const lessons = await Lesson.find({ levelId }).select('_id');
      const lessonIds = lessons.map(l => l._id);
      filter = { lessonId: { $in: lessonIds } };
    }

    const count = await Word.countDocuments(filter);
    if (count === 0) {
      return res.status(404).json({
        success: false,
        message: 'No words found for the selected criteria'
      });
    }

    const [randomWord] = await Word.aggregate([
      { $match: filter },
      { $sample: { size: 1 } }
    ]);

    // Determine direction based on lesson's directionMode if available
    let direction = Math.random() < 0.5 ? 'en-to-uz' : 'uz-to-en';
    if (lessonId) {
      const lesson = await Lesson.findById(lessonId).select('directionMode');
      if (lesson && lesson.directionMode && lesson.directionMode !== 'mixed') {
        direction = lesson.directionMode;
      }
    }

    const uzbekMeanings = randomWord.uzbek
      ? randomWord.uzbek.split(',').map(m => m.trim()).filter(Boolean).slice(0, 3)
      : [];
    const englishForms = randomWord.english
      ? randomWord.english.split(',').map(f => f.trim()).filter(Boolean).slice(0, 3)
      : [];

    res.json({
      success: true,
      data: {
        word: {
          id: randomWord._id,
          english: randomWord.english,
          uzbek: randomWord.uzbek,
          uzbekMeanings,
          englishForms,
          direction
        }
      }
    });
  } catch (error) {
    console.error('Get random word error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching word',
      error: error.message
    });
  }
};

// Check answer
exports.checkAnswer = async (req, res) => {
  try {
    const { wordId, answer, answers, direction } = req.body;

    if (!wordId || !direction) {
      return res.status(400).json({
        success: false,
        message: 'Word ID and direction are required'
      });
    }

    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({
        success: false,
        message: 'Word not found'
      });
    }

    let isCorrect = false;
    let correctAnswer = '';
    let userAnswer = '';

    if (direction === 'en-to-uz') {
      const meanings = word.uzbek.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
      correctAnswer = word.uzbek;

      // Support array of answers for multiple meanings
      if (Array.isArray(answers) && answers.length > 0) {
        const studentAnswers = answers.map(a => String(a).trim().toLowerCase()).filter(Boolean);
        userAnswer = studentAnswers.join(', ');
        // All meanings must be matched by student answers (order-independent, no duplicates allowed)
        const sortedMeanings = [...meanings].sort();
        const sortedAnswers = [...studentAnswers].sort();
        isCorrect = sortedMeanings.length === sortedAnswers.length &&
          sortedMeanings.every((m, i) => m === sortedAnswers[i]);
      } else if (answer) {
        // Backward compatibility: single answer
        const normalizedAnswer = String(answer).trim().toLowerCase();
        userAnswer = normalizedAnswer;
        isCorrect = meanings.some(m => m === normalizedAnswer);
      }
    } else if (direction === 'uz-to-en') {
      const englishForms = word.english.split(',').map(f => f.trim().toLowerCase()).filter(Boolean);
      correctAnswer = word.english;

      // Support array of answers for irregular verbs (e.g., "go, went, gone")
      if (Array.isArray(answers) && answers.length > 0) {
        const studentAnswers = answers.map(a => String(a).trim().toLowerCase()).filter(Boolean);
        userAnswer = studentAnswers.join(', ');
        // All English forms must be matched by student answers (order-independent, no duplicates)
        const sortedForms = [...englishForms].sort();
        const sortedAnswers = [...studentAnswers].sort();
        isCorrect = sortedForms.length === sortedAnswers.length &&
          sortedForms.every((f, i) => f === sortedAnswers[i]);
      } else if (answer) {
        const normalizedAnswer = String(answer).trim().toLowerCase();
        userAnswer = normalizedAnswer;
        isCorrect = englishForms.some(form => form === normalizedAnswer);
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid direction. Use "en-to-uz" or "uz-to-en"'
      });
    }

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer,
        userAnswer,
        direction
      }
    });
  } catch (error) {
    console.error('Check answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking answer',
      error: error.message
    });
  }
};

// Submit exam result
exports.submitResult = async (req, res) => {
  try {
    const { sessionStats } = req.body;
    const userId = req.user.id;

    if (!sessionStats) {
      return res.status(400).json({
        success: false,
        message: 'Session stats are required'
      });
    }

    const {
      totalAttempts,
      correctAnswers,
      enToUzCorrect,
      enToUzTotal,
      uzToEnCorrect,
      uzToEnTotal
    } = sessionStats;

    let progress = await HomeworkProgress.findOne({ studentId: userId });
    if (!progress) {
      progress = new HomeworkProgress({ studentId: userId });
    }

    progress.totalAttempts += totalAttempts || 0;
    progress.correctAnswers += correctAnswers || 0;
    progress.enToUzCorrect += enToUzCorrect || 0;
    progress.enToUzTotal += enToUzTotal || 0;
    progress.uzToEnCorrect += uzToEnCorrect || 0;
    progress.uzToEnTotal += uzToEnTotal || 0;
    progress.lastUpdated = new Date();

    await progress.save();

    res.json({
      success: true,
      message: 'Progress saved successfully',
      data: {
        progress: {
          totalAttempts: progress.totalAttempts,
          correctAnswers: progress.correctAnswers,
          accuracy: progress.getAccuracy(),
          enToUzAccuracy: progress.getEnToUzAccuracy(),
          uzToEnAccuracy: progress.getUzToEnAccuracy()
        }
      }
    });
  } catch (error) {
    console.error('Submit result error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving progress',
      error: error.message
    });
  }
};

// Get user progress
exports.getProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const progress = await HomeworkProgress.findOne({ studentId: userId });

    if (!progress) {
      return res.json({
        success: true,
        data: {
          progress: {
            totalAttempts: 0,
            correctAnswers: 0,
            accuracy: 0,
            enToUzAccuracy: 0,
            uzToEnAccuracy: 0
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        progress: {
          totalAttempts: progress.totalAttempts,
          correctAnswers: progress.correctAnswers,
          accuracy: progress.getAccuracy(),
          enToUzAccuracy: progress.getEnToUzAccuracy(),
          uzToEnAccuracy: progress.getUzToEnAccuracy(),
          lastUpdated: progress.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching progress',
      error: error.message
    });
  }
};

// ===== ADMIN WORD MANAGEMENT =====

// Get all levels (from Level collection)
exports.getLevels = async (req, res) => {
  try {
    const { languageId } = req.query;
    const filter = languageId ? { languageId } : {};
    const levels = await Level.find(filter).sort({ name: 1 });
    res.json({
      success: true,
      data: { levels }
    });
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching levels',
      error: error.message
    });
  }
};

// Get all words
exports.getAllWords = async (req, res) => {
  try {
    const words = await Word.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: words.length,
      data: { words }
    });
  } catch (error) {
    console.error('Get all words error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching words',
      error: error.message
    });
  }
};

// Add new word to a class (lesson)
exports.addWord = async (req, res) => {
  try {
    const { english, uzbek, lessonId } = req.body;

    if (!english || !uzbek || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'English, Uzbek words and class (lesson) ID are required'
      });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check word count limit
    if (lesson.maxWords && lesson.wordIds.length >= lesson.maxWords) {
      return res.status(400).json({
        success: false,
        message: `Class is full. Maximum ${lesson.maxWords} words allowed.`
      });
    }

    const trimmedEnglish = english.trim().toLowerCase();
    const trimmedUzbek = uzbek.trim().toLowerCase();

    // Only check for exact duplicate (same english + same uzbek) in SAME lesson
    const existingInLesson = await Word.findOne({
      lessonId,
      english: trimmedEnglish,
      uzbek: trimmedUzbek
    });

    if (existingInLesson) {
      return res.status(409).json({
        success: false,
        message: 'This word with the same meaning already exists in this class',
        duplicate: {
          english: existingInLesson.english,
          uzbek: existingInLesson.uzbek
        }
      });
    }

    const word = new Word({
      english: trimmedEnglish,
      uzbek: trimmedUzbek,
      lessonId
    });

    await word.save();

    // Add word to lesson
    lesson.wordIds.push(word._id);
    await lesson.save();

    res.status(201).json({
      success: true,
      message: 'Word added successfully',
      data: { word }
    });
  } catch (error) {
    console.error('Add word error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding word',
      error: error.message
    });
  }
};

// Update word
exports.updateWord = async (req, res) => {
  try {
    const { id } = req.params;
    const { english, uzbek } = req.body;

    const word = await Word.findById(id);
    if (!word) {
      return res.status(404).json({
        success: false,
        message: 'Word not found'
      });
    }

    if (english !== undefined) word.english = english.trim().toLowerCase();
    if (uzbek !== undefined) word.uzbek = uzbek.trim().toLowerCase();

    await word.save();

    res.json({
      success: true,
      message: 'Word updated successfully',
      data: { word }
    });
  } catch (error) {
    console.error('Update word error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating word',
      error: error.message
    });
  }
};

// Delete word
exports.deleteWord = async (req, res) => {
  try {
    const { id } = req.params;

    const word = await Word.findById(id);
    if (!word) {
      return res.status(404).json({
        success: false,
        message: 'Word not found'
      });
    }

    await Word.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Word deleted successfully'
    });
  } catch (error) {
    console.error('Delete word error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting word',
      error: error.message
    });
  }
};

// ===== ADMIN STUDENT PROGRESS =====

// Get all students with homework progress
exports.getAllStudentProgress = async (req, res) => {
  try {
    const students = await Student.find()
      .select('-password')
      .sort({ createdAt: -1 });

    const studentsWithProgress = await Promise.all(
      students.map(async (student) => {
        const progress = await HomeworkProgress.findOne({ studentId: student._id });
        return {
          ...student.toObject(),
          progress: progress ? {
            totalAttempts: progress.totalAttempts,
            correctAnswers: progress.correctAnswers,
            accuracy: progress.getAccuracy()
          } : null
        };
      })
    );

    res.json({
      success: true,
      count: students.length,
      data: { students: studentsWithProgress }
    });
  } catch (error) {
    console.error('Get all student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student progress',
      error: error.message
    });
  }
};

// Get single student progress
exports.getStudentProgress = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id).select('-password');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const progress = await HomeworkProgress.findOne({ studentId: id });

    res.json({
      success: true,
      data: {
        student,
        progress: progress ? {
          totalAttempts: progress.totalAttempts,
          correctAnswers: progress.correctAnswers,
          accuracy: progress.getAccuracy(),
          enToUzAccuracy: progress.getEnToUzAccuracy(),
          uzToEnAccuracy: progress.getUzToEnAccuracy(),
          enToUzCorrect: progress.enToUzCorrect,
          enToUzTotal: progress.enToUzTotal,
          uzToEnCorrect: progress.uzToEnCorrect,
          uzToEnTotal: progress.uzToEnTotal,
          lastUpdated: progress.lastUpdated
        } : null
      }
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student progress',
      error: error.message
    });
  }
};

// Reset student progress
exports.resetStudentProgress = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    await HomeworkProgress.findOneAndUpdate(
      { studentId: id },
      {
        totalAttempts: 0,
        correctAnswers: 0,
        enToUzCorrect: 0,
        enToUzTotal: 0,
        uzToEnCorrect: 0,
        uzToEnTotal: 0,
        lastUpdated: new Date()
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Student progress reset successfully'
    });
  } catch (error) {
    console.error('Reset student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting progress',
      error: error.message
    });
  }
};

// Get all student progress grouped by exam group
exports.getGroupStudentProgress = async (req, res) => {
  try {
    // Get all language names to filter only language-learning groups
    const languages = await Language.find().select('name').lean();
    const languageNames = new Set(languages.map(l => l.name.toLowerCase().trim()));

    // Get all exam groups with students and subject populated
    const groups = await ExamGroup.find()
      .populate('students', '_id name studentId profileImage status')
      .populate('subject', 'name')
      .select('_id groupId groupName subjectName subject students')
      .sort({ groupName: 1 });

    // Filter groups to only those whose subject is a language
    const languageGroups = groups.filter(group => {
      const subjName = group.subject?.name || group.subjectName || '';
      return languageNames.has(subjName.toLowerCase().trim());
    });

    // Get all progress data in parallel
    const [homeworkProgresses, vocabProgresses, sentenceProgresses] = await Promise.all([
      HomeworkProgress.find().lean(),
      StudentVocabProgress.find().lean(),
      StudentSentenceProgress.find().lean()
    ]);

    // Build lookup maps
    const hwMap = new Map(homeworkProgresses.map(p => [p.studentId.toString(), p]));
    const vocabMap = new Map();
    for (const p of vocabProgresses) {
      const sid = p.studentId.toString();
      if (!vocabMap.has(sid)) vocabMap.set(sid, []);
      vocabMap.get(sid).push(p);
    }
    const sentenceMap = new Map();
    for (const p of sentenceProgresses) {
      const sid = p.studentId.toString();
      if (!sentenceMap.has(sid)) sentenceMap.set(sid, []);
      sentenceMap.get(sid).push(p);
    }

    // Helper to compute stats for a student
    const computeStudentStats = (student) => {
      const sid = student._id.toString();
      const hw = hwMap.get(sid);
      const vocab = vocabMap.get(sid) || [];
      const sentences = sentenceMap.get(sid) || [];

      // Word practice accuracy from HomeworkProgress (inline calc since .lean() strips methods)
      const wordPracticeAccuracy = hw && hw.totalAttempts > 0
        ? Math.round((hw.correctAnswers / hw.totalAttempts) * 100)
        : 0;

      // Word exam accuracy: average bestExamScore across all lessons
      const wordExamScores = vocab
        .filter(p => p.bestExamScore > 0)
        .map(p => p.bestExamScore);
      const wordExamAccuracy = wordExamScores.length > 0
        ? Math.round(wordExamScores.reduce((a, b) => a + b, 0) / wordExamScores.length)
        : 0;

      // Sentence practice accuracy: aggregate from StudentSentenceProgress
      const sentenceTotalAttempts = sentences.reduce((sum, p) => sum + (p.attempts || 0), 0);
      const sentenceTotalCorrect = sentences.reduce((sum, p) => sum + (p.correctCount || 0), 0);
      const sentencePracticeAccuracy = sentenceTotalAttempts > 0
        ? Math.round((sentenceTotalCorrect / sentenceTotalAttempts) * 100)
        : 0;

      // Compute last activity date (most recent across all progress types)
      const dates = [];
      if (hw?.lastUpdated) dates.push(new Date(hw.lastUpdated));
      vocab.forEach(p => {
        if (p.lastPracticeDate) dates.push(new Date(p.lastPracticeDate));
        if (p.lastExamDate) dates.push(new Date(p.lastExamDate));
      });
      sentences.forEach(p => {
        if (p.lastPracticeDate) dates.push(new Date(p.lastPracticeDate));
      });
      const lastActivityDate = dates.length > 0
        ? new Date(Math.max(...dates))
        : null;

      return {
        _id: student._id,
        name: student.name,
        studentId: student.studentId,
        profileImage: student.profileImage,
        wordPracticeAccuracy,
        wordExamAccuracy,
        sentencePracticeAccuracy,
        lastActivityDate: lastActivityDate ? lastActivityDate.toISOString() : null
      };
    };

    // Build group-based response (only active students)
    const groupsData = languageGroups.map(group => {
      const activeStudents = (group.students || [])
        .filter(s => s && s.status === 'active')
        .map(computeStudentStats);
      const avgAccuracy = activeStudents.length > 0
        ? Math.round(activeStudents.reduce((sum, s) => sum + s.wordPracticeAccuracy + s.wordExamAccuracy + s.sentencePracticeAccuracy, 0) / (activeStudents.length * 3))
        : 0;

      return {
        groupId: group._id,
        groupName: group.groupName,
        subjectName: group.subject?.name || group.subjectName || '',
        studentCount: activeStudents.length,
        avgAccuracy,
        students: activeStudents
      };
    }).filter(g => g.studentCount > 0); // Only include groups with active students

    // Get unassigned active students (students not in any language group)
    const allGroupStudentIds = new Set();
    languageGroups.forEach(g => g.students.forEach(s => {
      if (s && s._id) allGroupStudentIds.add(s._id.toString());
    }));

    const unassignedStudents = await Student.find({
      _id: { $nin: Array.from(allGroupStudentIds).map(id => new mongoose.Types.ObjectId(id)) },
      status: 'active'
    }).select('_id name studentId profileImage status').sort({ name: 1 });

    const unassignedData = {
      studentCount: unassignedStudents.length,
      students: unassignedStudents.map(computeStudentStats)
    };

    // ---- Build lessons per group (by matching language name) ----
    // Fetch all lessons with level + language info
    const allLessons = await Lesson.find().select('_id name order type levelId').sort({ order: 1 }).lean();
    const levelIds = [...new Set(allLessons.map(l => l.levelId?.toString()).filter(Boolean))];
    const allLevels = await Level.find({ _id: { $in: levelIds } }).select('_id name languageId').lean();
    const levelMap = new Map(allLevels.map(l => [l._id.toString(), l]));
    const languageIds = [...new Set(allLevels.map(l => l.languageId?.toString()).filter(Boolean))];
    const allLanguages = await Language.find({ _id: { $in: languageIds } }).select('_id name').lean();
    const langIdToName = new Map(allLanguages.map(l => [l._id.toString(), l.name]));

    // Group lessons by language name (lowercased for match)
    const lessonsByLang = new Map();
    for (const lesson of allLessons) {
      const lvl = levelMap.get(lesson.levelId?.toString());
      const langName = langIdToName.get(lvl?.languageId?.toString());
      if (!langName) continue;
      const key = langName.toLowerCase().trim();
      if (!lessonsByLang.has(key)) lessonsByLang.set(key, []);
      lessonsByLang.get(key).push({
        _id: lesson._id.toString(),
        name: lesson.name,
        order: lesson.order,
        type: lesson.type || 'words',
        levelName: lvl?.name || ''
      });
    }

    // Attach lessons to each group
    groupsData.forEach(g => {
      const key = (g.subjectName || '').toLowerCase().trim();
      g.lessons = lessonsByLang.get(key) || [];
    });

    res.json({
      success: true,
      data: {
        groups: groupsData,
        unassigned: unassignedData
      }
    });
  } catch (error) {
    console.error('Get group student progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching group student progress',
      error: error.message
    });
  }
};

// Get per-lesson progress for a specific student (admin view)
exports.getStudentLessonProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = new mongoose.Types.ObjectId(id);

    // Fetch all lessons with level info
    const lessons = await Lesson.find().sort({ levelId: 1, order: 1 }).lean();
    const levelIds = [...new Set(lessons.map(l => l.levelId.toString()))];
    const levels = await Level.find({ _id: { $in: levelIds } }).select('name languageId').lean();
    const levelMap = new Map(levels.map(l => [l._id.toString(), l]));
    const languageIds = [...new Set(levels.map(l => l.languageId?.toString()).filter(Boolean))];
    const languages = await Language.find({ _id: { $in: languageIds } }).select('name').lean();
    const langMap = new Map(languages.map(l => [l._id.toString(), l.name]));

    // Fetch vocab progress for this student
    const vocabProgress = await StudentVocabProgress.find({ studentId }).lean();
    const vocabMap = new Map(vocabProgress.map(p => [p.lessonId.toString(), p]));

    // Fetch sentence progress for this student
    const sentenceProgress = await StudentSentenceProgress.find({ studentId }).lean();
    // Need to map sentenceIds to lessonIds
    const sentenceIds = sentenceProgress.map(p => p.sentenceId.toString());
    const sentences = await Sentence.find({ _id: { $in: sentenceIds } }).select('lessonId').lean();
    const sentenceLessonMap = new Map(sentences.map(s => [s._id.toString(), s.lessonId?.toString()]));

    // Aggregate sentence progress by lessonId
    const sentenceByLesson = new Map();
    for (const p of sentenceProgress) {
      const lessonId = sentenceLessonMap.get(p.sentenceId.toString());
      if (!lessonId) continue;
      if (!sentenceByLesson.has(lessonId)) {
        sentenceByLesson.set(lessonId, { attempts: 0, correctCount: 0 });
      }
      const agg = sentenceByLesson.get(lessonId);
      agg.attempts += p.attempts || 0;
      agg.correctCount += p.correctCount || 0;
    }

    // Build per-lesson data
    const wordLessons = [];
    const sentenceLessons = [];

    for (const lesson of lessons) {
      const level = levelMap.get(lesson.levelId?.toString());
      const languageName = langMap.get(level?.languageId?.toString()) || '';
      const levelName = level?.name || '';

      const base = {
        lessonId: lesson._id.toString(),
        lessonName: lesson.name,
        order: lesson.order,
        levelName,
        languageName,
        type: lesson.type
      };

      if (lesson.type === 'sentences') {
        const agg = sentenceByLesson.get(lesson._id.toString()) || { attempts: 0, correctCount: 0 };
        sentenceLessons.push({
          ...base,
          attempts: agg.attempts,
          correctCount: agg.correctCount,
          accuracy: agg.attempts > 0 ? Math.round((agg.correctCount / agg.attempts) * 100) : 0
        });
      } else {
        const vp = vocabMap.get(lesson._id.toString()) || {
          practiceAttempts: 0, practiceCorrect: 0, examAttempts: 0, bestExamScore: 0,
          wordsMemorized: 0, wordsTotal: 0, status: 'locked'
        };
        wordLessons.push({
          ...base,
          practiceAttempts: vp.practiceAttempts || 0,
          practiceCorrect: vp.practiceCorrect || 0,
          practiceAccuracy: (vp.practiceAttempts || 0) > 0 ? Math.round(((vp.practiceCorrect || 0) / vp.practiceAttempts) * 100) : 0,
          examAttempts: vp.examAttempts || 0,
          bestExamScore: vp.bestExamScore || 0,
          wordsMemorized: vp.wordsMemorized || 0,
          wordsTotal: vp.wordsTotal || 0,
          memorizationPercent: (vp.wordsTotal || 0) > 0 ? Math.round(((vp.wordsMemorized || 0) / vp.wordsTotal) * 100) : 0,
          status: vp.status || 'locked'
        });
      }
    }

    res.json({
      success: true,
      data: {
        studentId: id,
        wordLessons,
        sentenceLessons
      }
    });
  } catch (error) {
    console.error('Get student lesson progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching student lesson progress',
      error: error.message
    });
  }
};

// Get per-student stats for a specific lesson (admin view, for per-group lesson filter)
exports.getLessonStudentStats = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId).select('_id type').lean();
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const lessonObjId = new mongoose.Types.ObjectId(lessonId);
    const lessonType = lesson.type || 'words';
    const stats = {};

    if (lessonType === 'sentences') {
      // Find all sentences for this lesson
      const sentences = await Sentence.find({ lessonId: lessonObjId }).select('_id').lean();
      const sentenceIds = sentences.map(s => s._id);
      if (sentenceIds.length === 0) {
        return res.json({ success: true, data: { lessonId, type: 'sentences', stats: {} } });
      }
      // Aggregate per student
      const progresses = await StudentSentenceProgress.find({ sentenceId: { $in: sentenceIds } }).lean();
      for (const p of progresses) {
        const sid = p.studentId.toString();
        if (!stats[sid]) stats[sid] = { attempts: 0, correctCount: 0 };
        stats[sid].attempts += p.attempts || 0;
        stats[sid].correctCount += p.correctCount || 0;
      }
      for (const sid of Object.keys(stats)) {
        const s = stats[sid];
        s.accuracy = s.attempts > 0 ? Math.round((s.correctCount / s.attempts) * 100) : 0;
      }
    } else {
      // Word lesson: pull StudentVocabProgress for this lesson
      const progresses = await StudentVocabProgress.find({ lessonId: lessonObjId }).lean();
      for (const p of progresses) {
        const sid = p.studentId.toString();
        const practiceAttempts = p.practiceAttempts || 0;
        const practiceCorrect = p.practiceCorrect || 0;
        const wordsTotal = p.wordsTotal || 0;
        const wordsMemorized = p.wordsMemorized || 0;
        stats[sid] = {
          practiceAttempts,
          practiceCorrect,
          practiceAccuracy: practiceAttempts > 0 ? Math.round((practiceCorrect / practiceAttempts) * 100) : 0,
          examAttempts: p.examAttempts || 0,
          bestExamScore: p.bestExamScore || 0,
          wordsMemorized,
          wordsTotal,
          memorizationPercent: wordsTotal > 0 ? Math.round((wordsMemorized / wordsTotal) * 100) : 0,
          status: p.status || 'locked'
        };
      }
    }

    res.json({
      success: true,
      data: { lessonId, type: lessonType, stats }
    });
  } catch (error) {
    console.error('Get lesson student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lesson student stats',
      error: error.message
    });
  }
};

// Get top 10 words leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const progressRecords = await HomeworkProgress.find().lean();

    const studentIds = progressRecords.map(p => p.studentId.toString());
    const students = await Student.find({ _id: { $in: studentIds } }).select('name studentId profileImage');
    const studentInfoMap = new Map(students.map(s => [s._id.toString(), s]));

    const leaderboard = progressRecords
      .map(p => ({
        studentId: p.studentId.toString(),
        name: studentInfoMap.get(p.studentId.toString())?.name || 'Unknown',
        studentRoll: studentInfoMap.get(p.studentId.toString())?.studentId || '',
        profileImage: studentInfoMap.get(p.studentId.toString())?.profileImage || null,
        totalAttempts: p.totalAttempts,
        correctAnswers: p.correctAnswers,
        accuracy: p.totalAttempts > 0 ? Math.round((p.correctAnswers / p.totalAttempts) * 100) : 0
      }))
      .filter(s => s.totalAttempts > 0)
      .sort((a, b) => b.accuracy - a.accuracy || b.correctAnswers - a.correctAnswers)
      .slice(0, 10);

    res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error('Get words leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
