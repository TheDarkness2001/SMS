const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { protect, authorizeHomework } = require('../middleware/auth');

// Student specific routes (must come before /:id)
router.get('/student/progress', protect, lessonController.getStudentProgress);
router.get('/student/aggregated-progress', protect, lessonController.getStudentAggregatedProgress);
router.post('/student/init', protect, lessonController.initStudentProgress);
router.post('/student/practice-stats', protect, lessonController.updatePracticeStats);

// Admin-only: bulk student progress
router.get('/students/progress', protect, authorizeHomework(), lessonController.getAllStudentProgress);

// Read-only lesson routes (accessible to all authenticated users including students)
router.get('/', protect, lessonController.getAllLessons);
router.get('/:id', protect, lessonController.getLesson);

// Admin-only: lesson management (create, update, delete, auto-generate, toggle locks)
router.post('/', protect, authorizeHomework(), lessonController.createLesson);
router.put('/:id', protect, authorizeHomework(), lessonController.updateLesson);
router.delete('/:id', protect, authorizeHomework(), lessonController.deleteLesson);
router.post('/:id/auto-generate', protect, authorizeHomework(), lessonController.autoGenerateClasses);
router.delete('/:id/words/:wordId', protect, authorizeHomework(), lessonController.removeWordFromLesson);
router.post('/:id/toggle-exam-lock', protect, authorizeHomework(), lessonController.toggleExamLock);

// Student exam routes
router.get('/:id/exam', protect, lessonController.getExamWords);
router.post('/:id/exam', protect, lessonController.submitExam);

module.exports = router;
