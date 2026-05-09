const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const { protect, authorize, authorizeHomework } = require('../middleware/auth');

// Public game routes (any authenticated user)
router.get('/words/random', protect, homeworkController.getRandomWord);
router.post('/check-answer', protect, homeworkController.checkAnswer);

// Student exam routes (any authenticated user can submit)
router.post('/submit-result', protect, homeworkController.submitResult);
router.get('/progress', protect, homeworkController.getProgress);

// Admin word management (founder only + users with canManageHomework permission)
router.get('/levels', protect, homeworkController.getLevels);
router.get('/words', protect, authorizeHomework(), homeworkController.getAllWords);
router.post('/words', protect, authorizeHomework(), homeworkController.addWord);
router.put('/words/:id', protect, authorizeHomework(), homeworkController.updateWord);
router.delete('/words/:id', protect, authorizeHomework(), homeworkController.deleteWord);

// Admin student progress (founder only + users with canManageHomework permission)
router.get('/students/progress', protect, authorizeHomework(), homeworkController.getAllStudentProgress);
router.get('/students/group-progress', protect, authorizeHomework(), homeworkController.getGroupStudentProgress);
router.get('/students/:id/progress', protect, authorizeHomework(), homeworkController.getStudentProgress);
router.get('/students/:id/lesson-progress', protect, authorizeHomework(), homeworkController.getStudentLessonProgress);
router.post('/students/:id/reset-progress', protect, authorizeHomework(), homeworkController.resetStudentProgress);

// Leaderboard
router.get('/leaderboard', protect, homeworkController.getLeaderboard);

module.exports = router;
