const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ListeningExercise = require('../models/ListeningExercise');
const StudentListeningProgress = require('../models/StudentListeningProgress');
const Lesson = require('../models/Lesson');
const { analyzeListeningAnswer } = require('../utils/listeningValidator');
const { normalizeText } = require('../utils/textNormalizer');

exports.getAllExercises = async (req, res) => {
  try {
    const { lessonId, levelId } = req.query;
    const filter = {};

    if (lessonId) {
      filter.lessonId = lessonId;
    } else if (levelId) {
      const lessons = await Lesson.find({ levelId, type: 'listening' }).select('_id');
      filter.lessonId = { $in: lessons.map(l => l._id) };
    }

    const exercises = await ListeningExercise.find(filter)
      .populate('lessonId', 'name levelId')
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: exercises.length, data: { exercises } });
  } catch (error) {
    console.error('Get listening exercises error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRandomExercise = async (req, res) => {
  try {
    const { lessonId, levelId } = req.query;
    const filter = {};

    if (lessonId) {
      filter.lessonId = lessonId;
    } else if (levelId) {
      const lessons = await Lesson.find({ levelId, type: 'listening' }).select('_id');
      filter.lessonId = { $in: lessons.map(l => l._id) };
    }

    const count = await ListeningExercise.countDocuments(filter);
    if (count === 0) {
      return res.status(404).json({ success: false, message: 'No listening exercises available' });
    }

    const random = Math.floor(Math.random() * count);
    const exercise = await ListeningExercise.findOne(filter).skip(random);
    res.json({ success: true, data: { exercise } });
  } catch (error) {
    console.error('Get random listening exercise error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createExercise = async (req, res) => {
  try {
    const { title, script, lessonId, order } = req.body;

    if (!title?.trim() || !script?.trim()) {
      return res.status(400).json({ success: false, message: 'Title and script are required' });
    }
    if (!lessonId) {
      return res.status(400).json({ success: false, message: 'Lesson ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const exercise = new ListeningExercise({
      title: normalizeText(title),
      script: normalizeText(script),
      audioFile: req.file.filename,
      lessonId,
      order: order || 1
    });

    await exercise.save();
    res.status(201).json({ success: true, message: 'Listening exercise created', data: { exercise } });
  } catch (error) {
    console.error('Create listening exercise error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateExercise = async (req, res) => {
  try {
    const { title, script, order } = req.body;
    const exercise = await ListeningExercise.findById(req.params.id);

    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found' });
    }

    if (title?.trim()) exercise.title = normalizeText(title);
    if (script?.trim()) exercise.script = normalizeText(script);
    if (order !== undefined) exercise.order = order;

    if (req.file) {
      const oldPath = path.join(__dirname, '..', 'uploads', exercise.audioFile);
      if (fs.existsSync(oldPath)) {
        fs.unlink(oldPath, () => {});
      }
      exercise.audioFile = req.file.filename;
    }

    await exercise.save();
    res.json({ success: true, message: 'Listening exercise updated', data: { exercise } });
  } catch (error) {
    console.error('Update listening exercise error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteExercise = async (req, res) => {
  try {
    const exercise = await ListeningExercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found' });
    }

    const audioPath = path.join(__dirname, '..', 'uploads', exercise.audioFile);
    if (fs.existsSync(audioPath)) {
      fs.unlink(audioPath, () => {});
    }

    await StudentListeningProgress.deleteMany({ listeningId: req.params.id });
    await ListeningExercise.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Listening exercise deleted' });
  } catch (error) {
    console.error('Delete listening exercise error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.checkAnswer = async (req, res) => {
  try {
    const { listeningId, answer } = req.body;
    const studentId = req.user?.id || req.user?._id;

    if (!listeningId || !answer?.trim()) {
      return res.status(400).json({ success: false, message: 'Listening ID and answer are required' });
    }

    const exercise = await ListeningExercise.findById(listeningId);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found' });
    }

    const analysis = analyzeListeningAnswer(exercise.script, normalizeText(answer));

    if (studentId && req.userType === 'student') {
      let progress = await StudentListeningProgress.findOne({ studentId, listeningId });
      if (!progress) {
        progress = new StudentListeningProgress({ studentId, listeningId });
      }
      progress.attempts += 1;
      progress.lastAccuracy = analysis.accuracyPercent;
      progress.bestAccuracy = Math.max(progress.bestAccuracy, analysis.accuracyPercent);
      progress.lastPracticeDate = new Date();
      await progress.save();
    }

    res.json({
      success: true,
      data: {
        accuracyPercent: analysis.accuracyPercent,
        correctWords: analysis.correctWords,
        totalWords: analysis.totalWords,
        isCorrect: analysis.isCorrect,
        script: exercise.script,
        yourAnswer: answer.trim(),
        diff: analysis.diff
      }
    });
  } catch (error) {
    console.error('Check listening answer error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user?.id || req.user?._id;
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Student not authenticated' });
    }

    const progress = await StudentListeningProgress.find({ studentId });
    const totalAttempts = progress.reduce((sum, p) => sum + p.attempts, 0);
    const avgBest = progress.length > 0
      ? Math.round(progress.reduce((sum, p) => sum + p.bestAccuracy, 0) / progress.length)
      : 0;

    res.json({
      success: true,
      data: { progress, totalAttempts, avgBestAccuracy: avgBest }
    });
  } catch (error) {
    console.error('Get listening progress error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
