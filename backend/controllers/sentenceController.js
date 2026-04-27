const Sentence = require('../models/Sentence');
const StudentSentenceProgress = require('../models/StudentSentenceProgress');
const Student = require('../models/Student');
const Lesson = require('../models/Lesson');

// Get all sentences (filtered by lessonId or levelId)
exports.getAllSentences = async (req, res) => {
  try {
    const { lessonId, levelId } = req.query;
    const filter = {};

    if (lessonId) {
      filter.lessonId = lessonId;
    } else if (levelId) {
      // Find all lessons under this level, then get sentences for those lessons
      const lessons = await Lesson.find({ levelId }).select('_id');
      const lessonIds = lessons.map(l => l._id);
      filter.lessonId = { $in: lessonIds };
    }

    const sentences = await Sentence.find(filter)
      .populate('lessonId', 'name levelId')
      .sort({ createdAt: 1 });
    res.json({ success: true, count: sentences.length, data: { sentences } });
  } catch (error) {
    console.error('Get sentences error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get random sentence for practice
exports.getRandomSentence = async (req, res) => {
  try {
    const { lessonId, levelId } = req.query;
    const filter = {};

    if (lessonId) {
      filter.lessonId = lessonId;
    } else if (levelId) {
      const lessons = await Lesson.find({ levelId }).select('_id');
      const lessonIds = lessons.map(l => l._id);
      filter.lessonId = { $in: lessonIds };
    }

    const count = await Sentence.countDocuments(filter);
    if (count === 0) {
      return res.status(404).json({ success: false, message: 'No sentences available' });
    }
    const random = Math.floor(Math.random() * count);
    const sentence = await Sentence.findOne(filter).skip(random);
    res.json({ success: true, data: { sentence } });
  } catch (error) {
    console.error('Get random sentence error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Create sentence
exports.createSentence = async (req, res) => {
  try {
    const { english, uzbek, lessonId } = req.body;
    if (!english?.trim() || !uzbek?.trim()) {
      return res.status(400).json({ success: false, message: 'English and Uzbek sentences are required' });
    }
    if (!lessonId) {
      return res.status(400).json({ success: false, message: 'Lesson ID is required' });
    }
    const sentence = new Sentence({
      english: english.trim(),
      uzbek: uzbek.trim(),
      lessonId
    });
    await sentence.save();
    res.status(201).json({ success: true, message: 'Sentence created', data: { sentence } });
  } catch (error) {
    console.error('Create sentence error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update sentence
exports.updateSentence = async (req, res) => {
  try {
    const { english, uzbek, lessonId } = req.body;
    const updateData = {};
    if (english?.trim()) updateData.english = english.trim();
    if (uzbek?.trim()) updateData.uzbek = uzbek.trim();
    if (lessonId) updateData.lessonId = lessonId;

    const sentence = await Sentence.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!sentence) {
      return res.status(404).json({ success: false, message: 'Sentence not found' });
    }
    res.json({ success: true, message: 'Sentence updated', data: { sentence } });
  } catch (error) {
    console.error('Update sentence error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete sentence
exports.deleteSentence = async (req, res) => {
  try {
    const sentence = await Sentence.findByIdAndDelete(req.params.id);
    if (!sentence) {
      return res.status(404).json({ success: false, message: 'Sentence not found' });
    }
    // Also delete related progress
    await StudentSentenceProgress.deleteMany({ sentenceId: req.params.id });
    res.json({ success: true, message: 'Sentence and related progress deleted' });
  } catch (error) {
    console.error('Delete sentence error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Check sentence answer
exports.checkSentenceAnswer = async (req, res) => {
  try {
    const { sentenceId, answer, direction } = req.body;
    const studentId = req.user?.id || req.user?._id;

    if (!sentenceId || !answer?.trim()) {
      return res.status(400).json({ success: false, message: 'Sentence ID and answer are required' });
    }

    const sentence = await Sentence.findById(sentenceId);
    if (!sentence) {
      return res.status(404).json({ success: false, message: 'Sentence not found' });
    }

    const correctAnswer = direction === 'uzToEn' ? sentence.english : sentence.uzbek;
    const isCorrect = answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

    // Update progress if student
    if (studentId) {
      let progress = await StudentSentenceProgress.findOne({ studentId, sentenceId });
      if (!progress) {
        progress = new StudentSentenceProgress({ studentId, sentenceId });
      }
      progress.attempts += 1;
      if (isCorrect) progress.correctCount += 1;
      progress.lastPracticeDate = new Date();
      await progress.save();
    }

    res.json({
      success: true,
      data: {
        isCorrect,
        correctAnswer,
        yourAnswer: answer.trim()
      }
    });
  } catch (error) {
    console.error('Check sentence answer error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get student sentence progress
exports.getStudentSentenceProgress = async (req, res) => {
  try {
    const studentId = req.user?.id || req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Student not authenticated' });
    }

    const progress = await StudentSentenceProgress.find({ studentId });
    const totalAttempts = progress.reduce((sum, p) => sum + p.attempts, 0);
    const totalCorrect = progress.reduce((sum, p) => sum + p.correctCount, 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    res.json({
      success: true,
      data: {
        progress,
        totalAttempts,
        totalCorrect,
        accuracy
      }
    });
  } catch (error) {
    console.error('Get student sentence progress error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get top 10 students leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const progressRecords = await StudentSentenceProgress.find().lean();

    // Aggregate by student
    const studentMap = new Map();
    for (const record of progressRecords) {
      const sid = record.studentId.toString();
      if (!studentMap.has(sid)) {
        studentMap.set(sid, { studentId: sid, totalAttempts: 0, totalCorrect: 0 });
      }
      const s = studentMap.get(sid);
      s.totalAttempts += record.attempts;
      s.totalCorrect += record.correctCount;
    }

    const studentIds = Array.from(studentMap.keys());
    const students = await Student.find({ _id: { $in: studentIds } }).select('name studentId profileImage');
    const studentInfoMap = new Map(students.map(s => [s._id.toString(), s]));

    const leaderboard = Array.from(studentMap.values())
      .map(s => ({
        studentId: s.studentId,
        name: studentInfoMap.get(s.studentId)?.name || 'Unknown',
        studentRoll: studentInfoMap.get(s.studentId)?.studentId || '',
        profileImage: studentInfoMap.get(s.studentId)?.profileImage || null,
        totalAttempts: s.totalAttempts,
        totalCorrect: s.totalCorrect,
        accuracy: s.totalAttempts > 0 ? Math.round((s.totalCorrect / s.totalAttempts) * 100) : 0
      }))
      .filter(s => s.totalAttempts > 0)
      .sort((a, b) => b.accuracy - a.accuracy || b.totalCorrect - a.totalCorrect)
      .slice(0, 10);

    res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Submit practice session results
exports.submitPracticeResult = async (req, res) => {
  try {
    const { sessionStats } = req.body;
    const studentId = req.user?.id || req.user?._id;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Student not authenticated' });
    }

    if (!sessionStats || !Array.isArray(sessionStats.sentences)) {
      return res.status(400).json({ success: false, message: 'Invalid session stats' });
    }

    for (const stat of sessionStats.sentences) {
      let progress = await StudentSentenceProgress.findOne({
        studentId,
        sentenceId: stat.sentenceId
      });
      if (!progress) {
        progress = new StudentSentenceProgress({ studentId, sentenceId: stat.sentenceId });
      }
      progress.attempts += stat.attempts || 1;
      progress.correctCount += stat.correct || 0;
      progress.lastPracticeDate = new Date();
      await progress.save();
    }

    res.json({ success: true, message: 'Practice results saved' });
  } catch (error) {
    console.error('Submit practice result error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
