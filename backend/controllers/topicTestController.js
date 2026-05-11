const TopicTest = require('../models/TopicTest');
const StudentTestResult = require('../models/StudentTestResult');
const StudentVideoProgress = require('../models/StudentVideoProgress');
const VideoLesson = require('../models/VideoLesson');

// Normalize free-text answers for translation/short-answer/fill-blank.
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'`]/g, '')
    .replace(/\s+/g, ' ');
}

function isAnswerCorrect(question, userAnswer) {
  const type = question.type;
  const correct = question.correctAnswer;

  if (type === 'multiple-choice') {
    return String(userAnswer).trim() === String(correct).trim();
  }
  if (type === 'true-false') {
    return String(userAnswer).toLowerCase() === String(correct).toLowerCase();
  }
  // fill-blank / translation / short-answer: accept array or single string
  const ua = normalize(userAnswer);
  if (Array.isArray(correct)) {
    return correct.some(c => normalize(c) === ua);
  }
  return normalize(correct) === ua;
}

function stripAnswersForStudent(test) {
  if (!test) return null;
  const plain = test.toObject ? test.toObject() : { ...test };
  plain.questions = (plain.questions || []).map(q => ({
    _id: q._id,
    type: q.type,
    question: q.question,
    options: q.options || [],
    points: q.points || 1
  }));
  return plain;
}

// GET /api/video-lessons/:id/test
exports.getTopicTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode } = req.query; // 'practice' | 'exam' | undefined
    const isAdmin = req.user?.role === 'founder' || req.user?.permissions?.canManageHomework === true;
    const isStudent = req.user?.userType === 'student';

    const test = await TopicTest.findOne({ videoLessonId: id });
    if (!test) {
      return res.json({ success: true, data: { test: null } });
    }

    // For students, optionally enforce watch threshold for exam mode
    if (isStudent && mode === 'exam') {
      const video = await VideoLesson.findById(id).lean();
      const progress = await StudentVideoProgress.findOne({
        studentId: req.user.id,
        videoLessonId: id
      }).lean();
      const needed = video?.requireWatchPercent ?? 70;
      const watched = progress?.watchPercent || 0;
      if (watched < needed) {
        return res.status(403).json({
          success: false,
          message: `You must watch at least ${needed}% of the video before taking the exam.`,
          watched
        });
      }
    }

    if (isAdmin && !isStudent) {
      return res.json({ success: true, data: { test } });
    }
    res.json({ success: true, data: { test: stripAnswersForStudent(test) } });
  } catch (error) {
    console.error('getTopicTest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/video-lessons/:id/test (admin upsert)
exports.createOrUpdateTopicTest = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body, videoLessonId: id };

    // Basic validation of questions
    if (!Array.isArray(data.questions)) data.questions = [];
    for (const q of data.questions) {
      if (!q.type || !q.question || q.correctAnswer === undefined || q.correctAnswer === null) {
        return res.status(400).json({
          success: false,
          message: 'Each question must have type, question, and correctAnswer'
        });
      }
    }

    const test = await TopicTest.findOneAndUpdate(
      { videoLessonId: id },
      data,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, data: { test } });
  } catch (error) {
    console.error('createOrUpdateTopicTest error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/video-lessons/:id/test
exports.deleteTopicTest = async (req, res) => {
  try {
    const { id } = req.params;
    await TopicTest.deleteOne({ videoLessonId: id });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteTopicTest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/video-lessons/:id/test/attempt
// Body: { mode, answers: [{ questionId, answer }] }
exports.submitTestAttempt = async (req, res) => {
  try {
    const { id } = req.params;
    const { mode, answers = [], terminated = false, warnings = 0 } = req.body;
    const studentId = req.user.id;

    if (!['practice', 'exam'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Invalid mode' });
    }

    const test = await TopicTest.findOne({ videoLessonId: id });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Score server-side
    const answerMap = new Map(answers.map(a => [String(a.questionId), a.answer]));
    let correctCount = 0;
    const answerLog = test.questions.map(q => {
      const ua = answerMap.has(String(q._id)) ? answerMap.get(String(q._id)) : null;
      const ok = ua !== null && ua !== undefined && ua !== '' ? isAnswerCorrect(q, ua) : false;
      if (ok) correctCount++;
      return { questionId: q._id, userAnswer: ua, isCorrect: ok };
    });
    const totalQuestions = test.questions.length || 1;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= (test.passingScore || 70);

    // Upsert result doc (keeps bestScore across attempts)
    let result = await StudentTestResult.findOne({
      studentId,
      topicTestId: test._id,
      mode
    });
    if (!result) {
      result = new StudentTestResult({
        studentId,
        topicTestId: test._id,
        videoLessonId: id,
        mode
      });
    }
    result.score = score;
    result.totalQuestions = totalQuestions;
    result.correctCount = correctCount;
    result.bestScore = Math.max(result.bestScore || 0, score);
    result.attempts = (result.attempts || 0) + 1;
    result.passed = passed;
    result.warnings = warnings;
    result.terminated = !!terminated;
    result.answers = answerLog;
    result.completedAt = new Date();
    await result.save();

    // Return per-question feedback (for practice) or summary (for exam)
    const feedback = answerLog.map(a => {
      const q = test.questions.find(x => String(x._id) === String(a.questionId));
      return {
        questionId: a.questionId,
        isCorrect: a.isCorrect,
        userAnswer: a.userAnswer,
        correctAnswer: mode === 'practice' ? q?.correctAnswer : undefined,
        explanation: mode === 'practice' ? q?.explanation : undefined
      };
    });

    res.json({
      success: true,
      data: {
        score,
        correctCount,
        totalQuestions,
        passed,
        bestScore: result.bestScore,
        attempts: result.attempts,
        feedback
      }
    });
  } catch (error) {
    console.error('submitTestAttempt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/video-lessons/:id/test/warning
exports.recordAntiCheatWarning = async (req, res) => {
  try {
    const { id } = req.params;
    const { warnings } = req.body;
    // Stateless endpoint: frontend handles the strike counter and sends it
    // alongside final submit; this is just for optional server audit later.
    res.json({
      success: true,
      terminate: (warnings || 0) >= 3,
      videoLessonId: id
    });
  } catch (error) {
    console.error('recordAntiCheatWarning error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/video-lessons/:id/test/leaderboard
exports.getTestLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await TopicTest.findOne({ videoLessonId: id }).lean();
    if (!test) {
      return res.json({ success: true, data: { leaderboard: [] } });
    }
    const results = await StudentTestResult.find({
      topicTestId: test._id,
      mode: 'exam'
    })
      .populate('studentId', 'name studentId profileImage')
      .sort({ bestScore: -1, attempts: 1 })
      .limit(50)
      .lean();

    const leaderboard = results.map((r, i) => ({
      rank: i + 1,
      studentId: r.studentId?._id,
      name: r.studentId?.name || '-',
      profileImage: r.studentId?.profileImage || '',
      bestScore: r.bestScore,
      attempts: r.attempts,
      passed: r.passed
    }));
    res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error('getTestLeaderboard error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
