const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { protect, authorizeHomework } = require('../middleware/auth');

// Student specific routes (must come before /:id)
router.get('/student/progress', protect, lessonController.getStudentProgress);
router.get('/student/aggregated-progress', protect, lessonController.getStudentAggregatedProgress);
router.post('/student/init', protect, lessonController.initStudentProgress);
router.post('/student/practice-stats', protect, lessonController.updatePracticeStats);

// Admin routes (founder only + users with canManageHomework permission)
router.get('/students/progress', protect, authorizeHomework(), lessonController.getAllStudentProgress);
router.get('/', protect, authorizeHomework(), lessonController.getAllLessons);
router.post('/', protect, authorizeHomework(), lessonController.createLesson);
router.get('/:id', protect, authorizeHomework(), lessonController.getLesson);
router.put('/:id', protect, authorizeHomework(), lessonController.updateLesson);
router.delete('/:id', protect, authorizeHomework(), lessonController.deleteLesson);
router.post('/:id/auto-generate', protect, authorizeHomework(), lessonController.autoGenerateClasses);
router.delete('/:id/words/:wordId', protect, authorizeHomework(), lessonController.removeWordFromLesson);
router.post('/:id/toggle-exam-lock', protect, authorizeHomework(), lessonController.toggleExamLock);

// Student lesson routes
router.get('/:id/exam', protect, lessonController.getExamWords);
router.post('/:id/exam', protect, lessonController.submitExam);

module.exports = router;
