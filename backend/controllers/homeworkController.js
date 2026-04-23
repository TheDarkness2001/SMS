const Word = require('../models/Word');
const Lesson = require('../models/Lesson');
const Level = require('../models/Level');
const HomeworkProgress = require('../models/HomeworkProgress');
const Student = require('../models/Student');

// Get random word for practice
exports.getRandomWord = async (req, res) => {
  try {
    const { lessonId, levelId, mode } = req.query;
    let filter = {};

    if (lessonId) {
      filter = { lessonId };
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
    const direction = Math.random() < 0.5 ? 'en-to-uz' : 'uz-to-en';

    res.json({
      success: true,
      data: {
        word: {
          id: randomWord._id,
          english: randomWord.english,
          uzbek: randomWord.uzbek,
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
    const { wordId, answer, direction } = req.body;

    if (!wordId || !answer || !direction) {
      return res.status(400).json({
        success: false,
        message: 'Word ID, answer, and direction are required'
      });
    }

    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({
        success: false,
        message: 'Word not found'
      });
    }

    const normalizedAnswer = answer.trim().toLowerCase();
    let isCorrect = false;
    let correctAnswer = '';

    if (direction === 'en-to-uz') {
      correctAnswer = word.uzbek;
      isCorrect = normalizedAnswer === word.uzbek.toLowerCase();
    } else if (direction === 'uz-to-en') {
      correctAnswer = word.english;
      isCorrect = normalizedAnswer === word.english.toLowerCase();
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
        userAnswer: normalizedAnswer,
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

    // Check for duplicates across ALL lessons/levels
    const existingWord = await Word.findOne({
      english: trimmedEnglish
    }).populate({
      path: 'lessonId',
      select: 'name levelId',
      populate: {
        path: 'levelId',
        select: 'name'
      }
    });

    if (existingWord) {
      const sameMeaning = existingWord.uzbek.toLowerCase() === trimmedUzbek;
      const location = existingWord.lessonId?.levelId?.name 
        ? `${existingWord.lessonId.levelId.name} → ${existingWord.lessonId.name}`
        : existingWord.lessonId?.name || 'unknown location';

      if (sameMeaning) {
        return res.status(409).json({
          success: false,
          message: `This word already exists with the same meaning in ${location}`,
          duplicate: {
            english: existingWord.english,
            uzbek: existingWord.uzbek,
            location: location
          }
        });
      }
      // Different meaning - allow but warn (frontend can show a confirmation)
    }

    // Also check within same lesson for same Uzbek (different English)
    const existingUzbekInLesson = await Word.findOne({
      lessonId,
      uzbek: trimmedUzbek
    });

    if (existingUzbekInLesson) {
      return res.status(400).json({
        success: false,
        message: 'This Uzbek translation already exists in this class'
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

    if (english) word.english = english.trim().toLowerCase();
    if (uzbek) word.uzbek = uzbek.trim().toLowerCase();

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
