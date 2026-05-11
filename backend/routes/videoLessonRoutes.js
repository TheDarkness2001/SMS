const express = require('express');
const router = express.Router();
const videoLessonController = require('../controllers/videoLessonController');
const topicTestController = require('../controllers/topicTestController');
const { protect, authorizeVideoLessons } = require('../middleware/auth');

// Admin analytics + group progress (static paths BEFORE :id)
router.get('/analytics', protect, authorizeVideoLessons(), videoLessonController.getVideoAnalytics);
router.get('/group-progress', protect, authorizeVideoLessons(), videoLessonController.getGroupVideoProgress);

// Video CRUD
router.get('/', protect, videoLessonController.getAllVideoLessons);
router.post('/', protect, authorizeVideoLessons(), videoLessonController.addVideoLesson);
router.get('/:id', protect, videoLessonController.getVideoLessonById);
router.put('/:id', protect, authorizeVideoLessons(), videoLessonController.updateVideoLesson);
router.delete('/:id', protect, authorizeVideoLessons(), videoLessonController.deleteVideoLesson);

// Watch progress
router.post('/:id/track', protect, videoLessonController.trackWatchProgress);
router.post('/:id/complete', protect, videoLessonController.markAsCompleted);

// Admin: per-group watch unlock (one-at-a-time per level)
router.post('/:id/toggle-watch-unlock', protect, authorizeVideoLessons(), videoLessonController.toggleWatchUnlock);

// Topic test
router.get('/:id/test', protect, topicTestController.getTopicTest);
router.put('/:id/test', protect, authorizeVideoLessons(), topicTestController.createOrUpdateTopicTest);
router.delete('/:id/test', protect, authorizeVideoLessons(), topicTestController.deleteTopicTest);
router.post('/:id/test/attempt', protect, topicTestController.submitTestAttempt);
router.post('/:id/test/warning', protect, topicTestController.recordAntiCheatWarning);
router.get('/:id/test/leaderboard', protect, topicTestController.getTestLeaderboard);

module.exports = router;
