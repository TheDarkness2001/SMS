const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const { protect, authorize } = require('../middleware/auth');

// Public game routes (any authenticated user)
router.get('/words/random', protect, homeworkController.getRandomWord);
router.post('/check-answer', protect, homeworkController.checkAnswer);

// Student exam routes (any authenticated user can submit)
router.post('/submit-result', protect, homeworkController.submitResult);
router.get('/progress', protect, homeworkController.getProgress);

// Admin word management
router.get('/words', protect, authorize('admin', 'manager', 'founder'), homeworkController.getAllWords);
router.post('/words', protect, authorize('admin', 'manager', 'founder'), homeworkController.addWord);
router.put('/words/:id', protect, authorize('admin', 'manager', 'founder'), homeworkController.updateWord);
router.delete('/words/:id', protect, authorize('admin', 'manager', 'founder'), homeworkController.deleteWord);

// Admin student progress
router.get('/students/progress', protect, authorize('admin', 'manager', 'founder'), homeworkController.getAllStudentProgress);
router.get('/students/:id/progress', protect, authorize('admin', 'manager', 'founder'), homeworkController.getStudentProgress);
router.post('/students/:id/reset-progress', protect, authorize('admin', 'manager', 'founder'), homeworkController.resetStudentProgress);

module.exports = router;
