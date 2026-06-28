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
const { buildModuleTypeFilter, filterLanguagesForModule, filterLevelsForModule } = require('../utils/lessonTypes');
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

async function getExercisesForLevel(levelId) {
  const lessons = await Lesson.find({ levelId, type: 'listening' }).select('_id').lean();
  if (!lessons.length) return [];
  return ListeningExercise.find({ lessonId: { $in: lessons.map(l => l._id) } })
    .select('_id title order')
    .sort({ order: 1, createdAt: 1 })
    .lean();
}

async function buildListeningProgressMaps() {
  const [listeningProgress, exercises, lessons] = await Promise.all([
    StudentListeningProgress.find().lean(),
    ListeningExercise.find().select('_id lessonId').lean(),
    Lesson.find({ type: 'listening' }).select('_id levelId').lean()
  ]);

  const lessonToLevel = new Map(
    lessons.map((lesson) => [lesson._id.toString(), lesson.levelId?.toString()])
  );
  const exerciseToLevel = new Map();
  for (const exercise of exercises) {
    const levelId = lessonToLevel.get(exercise.lessonId?.toString());
    if (levelId) exerciseToLevel.set(exercise._id.toString(), levelId);
  }

  const listeningMap = new Map();
  for (const record of listeningProgress) {
    const sid = record.studentId.toString();
    if (!listeningMap.has(sid)) listeningMap.set(sid, []);
    listeningMap.get(sid).push({
      ...record,
      levelId: exerciseToLevel.get(record.listeningId?.toString()) || null
    });
  }

  return { listeningMap, exerciseToLevel };
}

function computeListeningStatsForStudent(records, allowedLevelIds = null, allowedExerciseId = null) {
  let filtered = records;
  if (allowedLevelIds) {
    const allowed = new Set([...allowedLevelIds].map(String));
    filtered = filtered.filter((record) => record.levelId && allowed.has(String(record.levelId)));
  }
  if (allowedExerciseId) {
    filtered = filtered.filter((record) => String(record.listeningId) === String(allowedExerciseId));
  }

  const totalAttempts = filtered.reduce((sum, record) => sum + (record.attempts || 0), 0);
  const avgBestAccuracy = filtered.length > 0
    ? Math.round(filtered.reduce((sum, record) => sum + (record.bestAccuracy || 0), 0) / filtered.length)
    : 0;
  const dates = filtered.map((record) => record.lastPracticeDate).filter(Boolean).map((d) => new Date(d));
  const lastActivityDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null;

  return { totalAttempts, avgBestAccuracy, lastActivityDate };
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
    const { softDeleteById } = require('../services/recycleBinService');
    const { getDeleteOptions } = require('../utils/deleteHelpers');

    const exercise = await ListeningExercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found' });
    }

    const recycleEntry = await softDeleteById(ListeningExercise, req.params.id, getDeleteOptions(req));

    res.json({
      success: true,
      message: 'Listening exercise moved to Recycle Bin',
      data: {
        recycleBinId: recycleEntry?._id,
        movedToRecycleBin: true
      }
    });
  } catch (error) {
    console.error('Delete listening exercise error:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || 'Server error', code: error.code });
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
    const moduleType = 'listening';
    let languages = await Language.find(buildModuleTypeFilter(moduleType)).select('_id name').lean();
    languages = await filterLanguagesForModule(languages, moduleType);
    const languageNames = new Set(languages.map((l) => l.name.toLowerCase().trim()));
    const languageByName = new Map(languages.map((l) => [l.name.toLowerCase().trim(), l]));

    let listeningLevels = await Level.find({
      languageId: { $in: languages.map((l) => l._id) },
      ...buildModuleTypeFilter(moduleType)
    }).select('_id name order languageId practiceUnlockedFor').lean();
    listeningLevels = await filterLevelsForModule(listeningLevels, moduleType);

    const levelsByLanguageName = new Map();
    for (const level of listeningLevels) {
      const language = languages.find((l) => String(l._id) === String(level.languageId));
      if (!language) continue;
      const key = language.name.toLowerCase().trim();
      if (!levelsByLanguageName.has(key)) levelsByLanguageName.set(key, []);
      levelsByLanguageName.get(key).push(level);
    }

    const groups = await ExamGroup.find()
      .populate('students', '_id name studentId profileImage status')
      .populate('subject', 'name')
      .select('_id groupId groupName subjectName subject students')
      .sort({ groupName: 1 });

    const { listeningMap } = await buildListeningProgressMaps();

    const groupsData = [];
    for (const group of groups) {
      const subjectKey = (group.subject?.name || group.subjectName || '').toLowerCase().trim();
      if (!languageNames.has(subjectKey)) continue;

      const languageLevels = levelsByLanguageName.get(subjectKey) || [];
      const unlockedLevels = languageLevels.filter((level) =>
        (level.practiceUnlockedFor || []).some((gid) => String(gid) === String(group._id))
      );
      if (!unlockedLevels.length) continue;

      const unlockedLevelIds = unlockedLevels.map((level) => level._id.toString());
      const levelsWithExercises = await Promise.all(
        unlockedLevels.map(async (level) => ({
          _id: level._id.toString(),
          name: level.name,
          order: level.order,
          exercises: (await getExercisesForLevel(level._id)).map((exercise) => ({
            _id: exercise._id.toString(),
            title: exercise.title,
            order: exercise.order
          }))
        }))
      );

      const activeStudents = (group.students || [])
        .filter((student) => student && student.status === 'active')
        .map((student) => {
          const sid = student._id.toString();
          const records = listeningMap.get(sid) || [];
          const stats = computeListeningStatsForStudent(records, unlockedLevelIds);
          return {
            _id: student._id,
            name: student.name,
            studentId: student.studentId,
            profileImage: student.profileImage,
            listeningPracticeAccuracy: stats.avgBestAccuracy,
            listeningAttempts: stats.totalAttempts,
            lastActivityDate: stats.lastActivityDate
          };
        });

      if (!activeStudents.length) continue;

      const avgAccuracy = Math.round(
        activeStudents.reduce((sum, student) => sum + student.listeningPracticeAccuracy, 0) / activeStudents.length
      );

      groupsData.push({
        groupId: group._id,
        groupName: group.groupName,
        subjectName: group.subject?.name || group.subjectName || languageByName.get(subjectKey)?.name || '',
        studentCount: activeStudents.length,
        avgAccuracy,
        students: activeStudents,
        levels: levelsWithExercises
      });
    }

    res.json({
      success: true,
      data: {
        groups: groupsData,
        unassigned: { studentCount: 0, students: [] }
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

exports.getExerciseStudentStats = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const exercise = await ListeningExercise.findById(exerciseId).select('_id lessonId').lean();
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Listening exercise not found' });
    }

    const stats = {};
    const progresses = await StudentListeningProgress.find({ listeningId: exerciseId }).lean();
    for (const progress of progresses) {
      const sid = progress.studentId.toString();
      stats[sid] = {
        attempts: progress.attempts || 0,
        accuracy: progress.bestAccuracy || 0
      };
    }

    res.json({
      success: true,
      data: {
        exerciseId,
        type: 'listening',
        stats
      }
    });
  } catch (error) {
    console.error('Get listening exercise stats error:', error);
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
