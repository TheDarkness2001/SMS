const express = require('express');
const router = express.Router();
const videoLessonController = require('../controllers/videoLessonController');
const topicTestController = require('../controllers/topicTestController');
const { protect, authorizeHomework } = require('../middleware/auth');

// Admin analytics + group progress (static paths BEFORE :id)
router.get('/analytics', protect, authorizeHomework(), videoLessonController.getVideoAnalytics);
router.get('/group-progress', protect, authorizeHomework(), videoLessonController.getGroupVideoProgress);

// Video CRUD
router.get('/', protect, videoLessonController.getAllVideoLessons);
router.post('/', protect, authorizeHomework(), videoLessonController.addVideoLesson);
router.get('/:id', protect, videoLessonController.getVideoLessonById);
router.put('/:id', protect, authorizeHomework(), videoLessonController.updateVideoLesson);
router.delete('/:id', protect, authorizeHomework(), videoLessonController.deleteVideoLesson);

// Watch progress
router.post('/:id/track', protect, videoLessonController.trackWatchProgress);
router.post('/:id/complete', protect, videoLessonController.markAsCompleted);

// Topic test
router.get('/:id/test', protect, topicTestController.getTopicTest);
router.put('/:id/test', protect, authorizeHomework(), topicTestController.createOrUpdateTopicTest);
router.delete('/:id/test', protect, authorizeHomework(), topicTestController.deleteTopicTest);
router.post('/:id/test/attempt', protect, topicTestController.submitTestAttempt);
router.post('/:id/test/warning', protect, topicTestController.recordAntiCheatWarning);
router.get('/:id/test/leaderboard', protect, topicTestController.getTestLeaderboard);

module.exports = router;
