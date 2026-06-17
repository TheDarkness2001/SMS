const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ListeningExercise = require('../models/ListeningExercise');
const StudentListeningProgress = require('../models/StudentListeningProgress');
const Lesson = require('../models/Lesson');
const Level = require('../models/Level');
const Language = require('../models/Language');
const ExamGroup = require('../models/ExamGroup');
const Student = require('../models/Student');
const { analyzeListeningAnswer } = require('../utils/listeningValidator');
const { normalizeText } = require('../utils/textNormalizer');

function isRemoteAudioUrl(audioFile) {
  return typeof audioFile === 'string' &&
    (audioFile.startsWith('http://') || audioFile.startsWith('https://'));
}

function deleteStoredAudioFile(audioFile) {
  if (!audioFile || isRemoteAudioUrl(audioFile)) return;
  const audioPath = path.join(__dirname, '..', 'uploads', audioFile);
  if (fs.existsSync(audioPath)) {
    fs.unlink(audioPath, () => {});
  }
}

async function getOrCreateListeningLessonForLevel(levelId) {
  let lesson = await Lesson.findOne({ levelId, type: 'listening' }).sort({ order: 1 });
  if (!lesson) {
    lesson = await Lesson.create({
      name: 'Exercises',
      levelId,
      order: 1,
      type: 'listening'
    });
  }
  return lesson;
}

async function getExerciseIdsForLevel(levelId) {
  const lessons = await Lesson.find({ levelId, type: 'listening' }).select('_id').lean();
  if (lessons.length === 0) return [];
  const exercises = await ListeningExercise.find({ lessonId: { $in: lessons.map(l => l._id) } }).select('_id').lean();
  return exercises.map(e => e._id);
}

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
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const isStudent = req.userType === 'student';
    const safeExercises = exercises.map(exercise => {
      if (!isStudent) return exercise;
      const { script, ...rest } = exercise;
      return rest;
    });

    res.json({ success: true, count: safeExercises.length, data: { exercises: safeExercises } });
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
    const { title, script, lessonId, levelId, order } = req.body;

    if (!title?.trim() || !script?.trim()) {
      return res.status(400).json({ success: false, message: 'Title and script are required' });
    }
    if (!lessonId && !levelId) {
      return res.status(400).json({ success: false, message: 'Level ID is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required' });
    }

    let resolvedLessonId = lessonId;
    if (!resolvedLessonId && levelId) {
      const level = await Level.findById(levelId);
      if (!level) {
        return res.status(404).json({ success: false, message: 'Level not found' });
      }
      const lesson = await getOrCreateListeningLessonForLevel(levelId);
      resolvedLessonId = lesson._id;
    }

    const lesson = await Lesson.findById(resolvedLessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const exercise = new ListeningExercise({
      title: normalizeText(title),
      script: normalizeText(script),
      audioFile: req.file.filename,
      lessonId: resolvedLessonId,
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
      deleteStoredAudioFile(exercise.audioFile);
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

    deleteStoredAudioFile(exercise.audioFile);

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

    if (!listeningId) {
      return res.status(400).json({ success: false, message: 'Listening ID is required' });
    }

    const exercise = await ListeningExercise.findById(listeningId);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found' });
    }

    const answerText = answer != null ? String(answer) : '';
    const analysis = analyzeListeningAnswer(exercise.script, answerText);

    if (analysis.error === 'INVALID TRANSCRIPT') {
      return res.status(400).json({ success: false, message: 'INVALID TRANSCRIPT' });
    }

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
        missingWords: analysis.showMissingWords ? analysis.missingWords : [],
        missingCount: analysis.showMissingWords ? analysis.missingCount : 0,
        resultTier: analysis.resultTier,
        taskFailed: analysis.taskFailed,
        passed: analysis.passed,
        tryAgain: analysis.tryAgain,
        showMissingWords: analysis.showMissingWords,
        isCorrect: analysis.isCorrect,
        formattedResult: analysis.formattedResult
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

function buildListeningStudentStats(progressRecords) {
  const studentMap = new Map();
  for (const record of progressRecords) {
    const sid = record.studentId.toString();
    if (!studentMap.has(sid)) {
      studentMap.set(sid, { studentId: sid, totalAttempts: 0, totalExercises: 0, bestSum: 0 });
    }
    const s = studentMap.get(sid);
    s.totalAttempts += record.attempts || 0;
    s.totalExercises += 1;
    s.bestSum += record.bestAccuracy || 0;
    if (record.lastPracticeDate) {
      const d = new Date(record.lastPracticeDate);
      if (!s.lastActivityDate || d > new Date(s.lastActivityDate)) {
        s.lastActivityDate = d.toISOString();
      }
    }
  }
  return studentMap;
}

exports.getLeaderboard = async (req, res) => {
  try {
    const progressRecords = await StudentListeningProgress.find().lean();
    const studentMap = buildListeningStudentStats(progressRecords);

    const studentIds = Array.from(studentMap.keys());
    const students = await Student.find({ _id: { $in: studentIds } }).select('name studentId profileImage');
    const studentInfoMap = new Map(students.map(s => [s._id.toString(), s]));

    const allRanked = Array.from(studentMap.values())
      .map(s => ({
        studentId: s.studentId,
        name: studentInfoMap.get(s.studentId)?.name || 'Unknown',
        studentRoll: studentInfoMap.get(s.studentId)?.studentId || '',
        profileImage: studentInfoMap.get(s.studentId)?.profileImage || null,
        totalAttempts: s.totalAttempts,
        totalExercises: s.totalExercises,
        avgBestAccuracy: s.totalExercises > 0 ? Math.round(s.bestSum / s.totalExercises) : 0
      }))
      .filter(s => s.totalAttempts > 0)
      .sort((a, b) => b.avgBestAccuracy - a.avgBestAccuracy || b.totalAttempts - a.totalAttempts);

    const leaderboard = allRanked.slice(0, 10).map((s, i) => ({ ...s, rank: i + 1 }));

    let currentStudent = null;
    if (req.userType === 'student' && req.user?._id) {
      const sid = req.user._id.toString();
      const idx = allRanked.findIndex(s => s.studentId === sid);
      if (idx >= 0) {
        currentStudent = { ...allRanked[idx], rank: idx + 1, totalStudents: allRanked.length };
      }
    }

    res.json({ success: true, data: { leaderboard, currentStudent } });
  } catch (error) {
    console.error('Get listening leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getGroupStudentProgress = async (req, res) => {
  try {
    const languages = await Language.find().select('name').lean();
    const languageNames = new Set(languages.map(l => l.name.toLowerCase().trim()));

    const groups = await ExamGroup.find()
      .populate('students', '_id name studentId profileImage status')
      .populate('subject', 'name')
      .select('_id groupId groupName subjectName subject students')
      .sort({ groupName: 1 });

    const languageGroups = groups.filter(group => {
      const subjName = group.subject?.name || group.subjectName || '';
      return languageNames.has(subjName.toLowerCase().trim());
    });

    const listeningProgress = await StudentListeningProgress.find().lean();
    const listeningMap = new Map();
    for (const p of listeningProgress) {
      const sid = p.studentId.toString();
      if (!listeningMap.has(sid)) listeningMap.set(sid, []);
      listeningMap.get(sid).push(p);
    }

    const computeStudentStats = (student) => {
      const sid = student._id.toString();
      const records = listeningMap.get(sid) || [];
      const totalAttempts = records.reduce((sum, p) => sum + (p.attempts || 0), 0);
      const avgBestAccuracy = records.length > 0
        ? Math.round(records.reduce((sum, p) => sum + (p.bestAccuracy || 0), 0) / records.length)
        : 0;
      const dates = records.map(p => p.lastPracticeDate).filter(Boolean).map(d => new Date(d));
      const lastActivityDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

      return {
        _id: student._id,
        name: student.name,
        studentId: student.studentId,
        profileImage: student.profileImage,
        listeningPracticeAccuracy: avgBestAccuracy,
        listeningAttempts: totalAttempts,
        lastActivityDate
      };
    };

    const groupsData = languageGroups.map(group => {
      const activeStudents = (group.students || [])
        .filter(s => s && s.status === 'active')
        .map(computeStudentStats);
      const avgAccuracy = activeStudents.length > 0
        ? Math.round(activeStudents.reduce((sum, s) => sum + s.listeningPracticeAccuracy, 0) / activeStudents.length)
        : 0;

      return {
        groupId: group._id,
        groupName: group.groupName,
        subjectName: group.subject?.name || group.subjectName || '',
        studentCount: activeStudents.length,
        avgAccuracy,
        students: activeStudents
      };
    }).filter(g => g.studentCount > 0);

    const allGroupStudentIds = new Set();
    languageGroups.forEach(g => g.students.forEach(s => {
      if (s && s._id) allGroupStudentIds.add(s._id.toString());
    }));

    const unassignedStudents = await Student.find({
      _id: { $nin: Array.from(allGroupStudentIds).map(id => new mongoose.Types.ObjectId(id)) },
      status: 'active'
    }).select('_id name studentId profileImage status').sort({ name: 1 });

    const allLevels = await Level.find().select('_id name order languageId').sort({ order: 1 }).lean();
    const languageIds = [...new Set(allLevels.map(l => l.languageId?.toString()).filter(Boolean))];
    const allLanguages = await Language.find({ _id: { $in: languageIds } }).select('_id name').lean();
    const langIdToName = new Map(allLanguages.map(l => [l._id.toString(), l.name]));

    const levelsByLang = new Map();
    for (const level of allLevels) {
      const langName = langIdToName.get(level.languageId?.toString());
      if (!langName) continue;
      const key = langName.toLowerCase().trim();
      if (!levelsByLang.has(key)) levelsByLang.set(key, []);
      levelsByLang.get(key).push({
        _id: level._id.toString(),
        name: level.name,
        order: level.order
      });
    }

    groupsData.forEach(g => {
      const key = (g.subjectName || '').toLowerCase().trim();
      g.levels = levelsByLang.get(key) || [];
    });

    res.json({
      success: true,
      data: {
        groups: groupsData,
        unassigned: {
          studentCount: unassignedStudents.length,
          students: unassignedStudents.map(computeStudentStats)
        }
      }
    });
  } catch (error) {
    console.error('Get listening group progress error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLessonStudentStats = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const exercises = await ListeningExercise.find({ lessonId }).select('_id').lean();
    const exerciseIds = exercises.map(e => e._id);
    const stats = {};

    if (exerciseIds.length === 0) {
      return res.json({ success: true, data: { lessonId, type: 'listening', stats: {} } });
    }

    const progresses = await StudentListeningProgress.find({ listeningId: { $in: exerciseIds } }).lean();
    for (const p of progresses) {
      const sid = p.studentId.toString();
      if (!stats[sid]) stats[sid] = { attempts: 0, bestAccuracy: 0, exerciseCount: 0, accuracySum: 0 };
      stats[sid].attempts += p.attempts || 0;
      stats[sid].exerciseCount += 1;
      stats[sid].accuracySum += p.bestAccuracy || 0;
    }
    for (const sid of Object.keys(stats)) {
      const s = stats[sid];
      s.accuracy = s.exerciseCount > 0 ? Math.round(s.accuracySum / s.exerciseCount) : 0;
    }

    res.json({ success: true, data: { lessonId, type: 'listening', stats } });
  } catch (error) {
    console.error('Get listening lesson stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLevelStudentStats = async (req, res) => {
  try {
    const { levelId } = req.params;
    const exerciseIds = await getExerciseIdsForLevel(levelId);
    const stats = {};

    if (exerciseIds.length === 0) {
      return res.json({ success: true, data: { levelId, type: 'listening', stats: {} } });
    }

    const progresses = await StudentListeningProgress.find({ listeningId: { $in: exerciseIds } }).lean();
    for (const p of progresses) {
      const sid = p.studentId.toString();
      if (!stats[sid]) stats[sid] = { attempts: 0, bestAccuracy: 0, exerciseCount: 0, accuracySum: 0 };
      stats[sid].attempts += p.attempts || 0;
      stats[sid].exerciseCount += 1;
      stats[sid].accuracySum += p.bestAccuracy || 0;
    }
    for (const sid of Object.keys(stats)) {
      const s = stats[sid];
      s.accuracy = s.exerciseCount > 0 ? Math.round(s.accuracySum / s.exerciseCount) : 0;
    }

    res.json({ success: true, data: { levelId, type: 'listening', stats } });
  } catch (error) {
    console.error('Get listening level stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const AUDIO_MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.webm': 'audio/webm'
};

exports.streamAudio = async (req, res) => {
  try {
    const exercise = await ListeningExercise.findById(req.params.id).select('audioFile');
    if (!exercise?.audioFile) {
      return res.status(404).send('Audio not found');
    }

    if (isRemoteAudioUrl(exercise.audioFile)) {
      return res.redirect(302, exercise.audioFile);
    }

    const audioPath = path.join(__dirname, '..', 'uploads', exercise.audioFile);
    if (!fs.existsSync(audioPath)) {
      return res.status(404).send('Audio file missing. Please re-upload this exercise.');
    }

    const ext = path.extname(exercise.audioFile).toLowerCase();
    res.setHeader('Content-Type', AUDIO_MIME_TYPES[ext] || 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.sendFile(audioPath);
  } catch (error) {
    console.error('Stream listening audio error:', error);
    res.status(500).send('Server error');
  }
};
