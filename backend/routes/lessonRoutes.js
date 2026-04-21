const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { protect, authorize } = require('../middleware/auth');

// Student specific routes (must come before /:id)
router.get('/student/progress', protect, lessonController.getStudentProgress);
router.post('/student/init', protect, lessonController.initStudentProgress);

// Admin routes
router.get('/students/progress', protect, authorize('admin', 'manager', 'founder'), lessonController.getAllStudentProgress);
router.get('/', protect, authorize('admin', 'manager', 'founder'), lessonController.getAllLessons);
router.post('/', protect, authorize('admin', 'manager', 'founder'), lessonController.createLesson);
router.get('/:id', protect, authorize('admin', 'manager', 'founder'), lessonController.getLesson);
router.put('/:id', protect, authorize('admin', 'manager', 'founder'), lessonController.updateLesson);
router.delete('/:id', protect, authorize('admin', 'manager', 'founder'), lessonController.deleteLesson);
router.post('/:id/words', protect, authorize('admin', 'manager', 'founder'), lessonController.addWordsToLesson);
router.delete('/:id/words/:wordId', protect, authorize('admin', 'manager', 'founder'), lessonController.removeWordFromLesson);

// Student lesson routes
router.get('/:id/exam', protect, lessonController.getExamWords);
router.post('/:id/exam', protect, lessonController.submitExam);

module.exports = router;
