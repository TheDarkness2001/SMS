const VideoLesson = require('../models/VideoLesson');
const StudentVideoProgress = require('../models/StudentVideoProgress');
const TopicTest = require('../models/TopicTest');
const StudentTestResult = require('../models/StudentTestResult');
const ExamGroup = require('../models/ExamGroup');
const Student = require('../models/Student');
const Language = require('../models/Language');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');

// Scope helper: for students, fetch the set of languageIds they can access
// via their enrolled active ExamGroups.
async function getStudentAccessibleLanguageIds(studentId) {
  const groups = await ExamGroup.find({ students: studentId })
    .populate('subject', 'name')
    .select('subject subjectName students')
    .lean();
  if (!groups.length) return [];
  const subjectNames = groups
    .map(g => (g.subject?.name || g.subjectName || '').toLowerCase().trim())
    .filter(Boolean);
  if (!subjectNames.length) return [];
  const languages = await Language.find({}).select('_id name').lean();
  return languages
    .filter(l => subjectNames.includes((l.name || '').toLowerCase().trim()))
    .map(l => l._id);
}

// GET /api/video-lessons
exports.getAllVideoLessons = async (req, res) => {
  try {
    const { languageId, levelId, lessonId } = req.query;
    const filter = { isActive: true };

    if (languageId) filter.languageId = languageId;
    if (levelId) filter.levelId = levelId;
    if (lessonId) filter.lessonId = lessonId;

    // Students only see videos for languages they are enrolled in
    const isStudent = req.user?.userType === 'student';
    if (isStudent) {
      const allowedLangIds = await getStudentAccessibleLanguageIds(req.user.id);
      if (!allowedLangIds.length) {
        return res.json({ success: true, data: { videoLessons: [] } });
      }
      if (filter.languageId) {
        if (!allowedLangIds.map(String).includes(String(filter.languageId))) {
          return res.json({ success: true, data: { videoLessons: [] } });
        }
      } else {
        filter.languageId = { $in: allowedLangIds };
      }
    }

    const videoLessons = await VideoLesson.find(filter)
      .populate('languageId', 'name')
      .populate('levelId', 'name')
      .populate('lessonId', 'name order type')
      .sort({ createdAt: -1 })
      .lean();

    // If student, attach their per-video progress
    if (isStudent && videoLessons.length) {
      const videoIds = videoLessons.map(v => v._id);
      const progressDocs = await StudentVideoProgress.find({
        studentId: req.user.id,
        videoLessonId: { $in: videoIds }
      }).lean();
      const progressMap = new Map(
        progressDocs.map(p => [p.videoLessonId.toString(), p])
      );
      videoLessons.forEach(v => {
        v.progress = progressMap.get(v._id.toString()) || null;
      });
    }

    res.json({ success: true, data: { videoLessons } });
  } catch (error) {
    console.error('getAllVideoLessons error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/video-lessons/:id
exports.getVideoLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await VideoLesson.findById(id)
      .populate('languageId', 'name')
      .populate('levelId', 'name')
      .populate('lessonId', 'name order type')
      .lean();

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video lesson not found' });
    }

    const test = await TopicTest.findOne({ videoLessonId: id }).lean();
    let progress = null;
    if (req.user?.userType === 'student') {
      progress = await StudentVideoProgress.findOne({
        studentId: req.user.id,
        videoLessonId: id
      }).lean();
    }

    res.json({
      success: true,
      data: {
        videoLesson: video,
        hasTest: !!(test && test.questions && test.questions.length > 0),
        testMeta: test
          ? {
              _id: test._id,
              title: test.title,
              practiceEnabled: test.practiceEnabled,
              examEnabled: test.examEnabled,
              timerSeconds: test.timerSeconds,
              passingScore: test.passingScore,
              questionCount: test.questions.length
            }
          : null,
        progress
      }
    });
  } catch (error) {
    console.error('getVideoLessonById error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/video-lessons
exports.addVideoLesson = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.user?.id) {
      data.createdBy = req.user.id;
      data.createdByModel = req.user.userType === 'teacher' ? 'Teacher' : 'StaffAccount';
    }

    if (!data.youtubeUrl) {
      return res.status(400).json({ success: false, message: 'YouTube URL is required' });
    }
    const videoId = VideoLesson.extractYouTubeId(data.youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
    }

    const video = await VideoLesson.create(data);
    res.status(201).json({ success: true, data: { videoLesson: video } });
  } catch (error) {
    console.error('addVideoLesson error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/video-lessons/:id
exports.updateVideoLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    const video = await VideoLesson.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video lesson not found' });
    }
    Object.assign(video, update);
    await video.save();
    res.json({ success: true, data: { videoLesson: video } });
  } catch (error) {
    console.error('updateVideoLesson error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/video-lessons/:id
exports.deleteVideoLesson = async (req, res) => {
  try {
    const { id } = req.params;
    await VideoLesson.findByIdAndDelete(id);
    await TopicTest.deleteOne({ videoLessonId: id });
    await StudentVideoProgress.deleteMany({ videoLessonId: id });
    await StudentTestResult.deleteMany({ videoLessonId: id });
    res.json({ success: true, message: 'Video lesson deleted' });
  } catch (error) {
    console.error('deleteVideoLesson error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/video-lessons/:id/track
exports.trackWatchProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { watchPercent, lastTimestamp, delta, newSession } = req.body;
    const studentId = req.user.id;

    const video = await VideoLesson.findById(id).lean();
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video lesson not found' });
    }

    let progress = await StudentVideoProgress.findOne({
      studentId,
      videoLessonId: id
    });

    if (!progress) {
      progress = new StudentVideoProgress({
        studentId,
        videoLessonId: id,
        rewatchCount: 0
      });
    }

    if (typeof watchPercent === 'number') {
      progress.watchPercent = Math.max(progress.watchPercent || 0, Math.min(100, watchPercent));
    }
    if (typeof lastTimestamp === 'number') {
      progress.lastTimestamp = lastTimestamp;
    }
    if (typeof delta === 'number' && delta > 0) {
      progress.totalWatchTime = (progress.totalWatchTime || 0) + delta;
    }
    if (newSession) {
      progress.rewatchCount = (progress.rewatchCount || 0) + 1;
    }
    progress.lastAccessAt = new Date();

    const threshold = video.requireWatchPercent || 70;
    if (!progress.completed && progress.watchPercent >= threshold) {
      progress.completed = true;
      progress.completedAt = new Date();
    }

    await progress.save();
    res.json({ success: true, data: { progress } });
  } catch (error) {
    console.error('trackWatchProgress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/video-lessons/:id/complete
exports.markAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    let progress = await StudentVideoProgress.findOne({
      studentId,
      videoLessonId: id
    });
    if (!progress) {
      progress = new StudentVideoProgress({ studentId, videoLessonId: id });
    }
    progress.completed = true;
    progress.completedAt = new Date();
    progress.watchPercent = Math.max(progress.watchPercent || 0, 100);
    progress.lastAccessAt = new Date();
    await progress.save();
    res.json({ success: true, data: { progress } });
  } catch (error) {
    console.error('markAsCompleted error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/video-lessons/analytics
exports.getVideoAnalytics = async (req, res) => {
  try {
    const { languageId, levelId } = req.query;
    const videoFilter = { isActive: true };
    if (languageId) videoFilter.languageId = languageId;
    if (levelId) videoFilter.levelId = levelId;

    const videos = await VideoLesson.find(videoFilter)
      .select('_id title levelId languageId requireWatchPercent')
      .populate('levelId', 'name')
      .populate('languageId', 'name')
      .lean();
    const videoIds = videos.map(v => v._id);

    const [progressDocs, testResults] = await Promise.all([
      StudentVideoProgress.find({ videoLessonId: { $in: videoIds } }).lean(),
      StudentTestResult.find({ videoLessonId: { $in: videoIds }, mode: 'exam' }).lean()
    ]);

    const perVideo = videos.map(v => {
      const vid = v._id.toString();
      const progs = progressDocs.filter(p => p.videoLessonId.toString() === vid);
      const results = testResults.filter(r => r.videoLessonId.toString() === vid);
      const totalStudents = progs.length;
      const completed = progs.filter(p => p.completed).length;
      const totalWatchTime = progs.reduce((s, p) => s + (p.totalWatchTime || 0), 0);
      const totalRewatch = progs.reduce((s, p) => s + (p.rewatchCount || 0), 0);
      const avgScore = results.length
        ? Math.round(results.reduce((s, r) => s + (r.bestScore || 0), 0) / results.length)
        : 0;
      return {
        _id: v._id,
        title: v.title,
        levelName: v.levelId?.name || '',
        languageName: v.languageId?.name || '',
        totalStudents,
        completed,
        completionPercent: totalStudents ? Math.round((completed / totalStudents) * 100) : 0,
        totalWatchTime,
        totalRewatch,
        avgScore,
        attempts: results.length
      };
    });

    const totals = {
      totalVideos: videos.length,
      totalWatchTime: perVideo.reduce((s, v) => s + v.totalWatchTime, 0),
      avgCompletion: perVideo.length
        ? Math.round(perVideo.reduce((s, v) => s + v.completionPercent, 0) / perVideo.length)
        : 0,
      avgScore: perVideo.length
        ? Math.round(perVideo.reduce((s, v) => s + v.avgScore, 0) / perVideo.length)
        : 0
    };

    res.json({ success: true, data: { totals, perVideo } });
  } catch (error) {
    console.error('getVideoAnalytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/video-lessons/group-progress
exports.getGroupVideoProgress = async (req, res) => {
  try {
    const groups = await ExamGroup.find()
      .populate({
        path: 'students',
        match: { status: 'active' },
        select: '_id name studentId profileImage status'
      })
      .populate('subject', 'name')
      .select('_id groupId groupName subjectName subject students')
      .lean();

    const videos = await VideoLesson.find({ isActive: true })
      .select('_id title languageId levelId')
      .populate('languageId', 'name')
      .populate('levelId', 'name')
      .lean();
    const videoIds = videos.map(v => v._id);

    const allStudentIds = new Set();
    groups.forEach(g => {
      (g.students || []).forEach(s => {
        if (s && s._id) allStudentIds.add(s._id.toString());
      });
    });

    const progress = await StudentVideoProgress.find({
      studentId: { $in: [...allStudentIds] },
      videoLessonId: { $in: videoIds }
    }).lean();
    const testResults = await StudentTestResult.find({
      studentId: { $in: [...allStudentIds] },
      videoLessonId: { $in: videoIds },
      mode: 'exam'
    }).lean();

    const groupsData = groups.map(group => {
      const subjName = group.subject?.name || group.subjectName || '';
      const subjKey = subjName.toLowerCase().trim();
      const relevantVideos = videos.filter(
        v => (v.languageId?.name || '').toLowerCase().trim() === subjKey
      );
      const relevantIds = new Set(relevantVideos.map(v => v._id.toString()));

      const studentsStats = (group.students || [])
        .filter(s => s && s.status === 'active')
        .map(student => {
          const sid = student._id.toString();
          const progs = progress.filter(
            p => p.studentId.toString() === sid && relevantIds.has(p.videoLessonId.toString())
          );
          const results = testResults.filter(
            r => r.studentId.toString() === sid && relevantIds.has(r.videoLessonId.toString())
          );
          const totalVideos = relevantVideos.length;
          const completed = progs.filter(p => p.completed).length;
          const avgWatch = progs.length
            ? Math.round(progs.reduce((s, p) => s + (p.watchPercent || 0), 0) / progs.length)
            : 0;
          const avgScore = results.length
            ? Math.round(results.reduce((s, r) => s + (r.bestScore || 0), 0) / results.length)
            : 0;
          const passed = results.filter(r => r.passed).length;
          return {
            _id: student._id,
            name: student.name,
            studentId: student.studentId,
            profileImage: student.profileImage || '',
            totalVideos,
            completed,
            completionPercent: totalVideos ? Math.round((completed / totalVideos) * 100) : 0,
            avgWatch,
            avgScore,
            passed,
            examsTaken: results.length
          };
        });

      return {
        groupId: group._id,
        groupName: group.groupName,
        subjectName: subjName,
        videos: relevantVideos.map(v => ({
          _id: v._id,
          title: v.title,
          levelName: v.levelId?.name || ''
        })),
        students: studentsStats
      };
    });

    res.json({ success: true, data: { groups: groupsData } });
  } catch (error) {
    console.error('getGroupVideoProgress error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
