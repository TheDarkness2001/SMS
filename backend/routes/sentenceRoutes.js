const express = require('express');
const router = express.Router();
const sentenceController = require('../controllers/sentenceController');
const { protect } = require('../middleware/auth');

// Public practice routes (student or teacher)
router.get('/sentences/random', protect, sentenceController.getRandomSentence);
router.post('/sentences/check', protect, sentenceController.checkSentenceAnswer);
router.get('/sentences/progress', protect, sentenceController.getStudentSentenceProgress);
router.post('/sentences/submit-result', protect, sentenceController.submitPracticeResult);
router.get('/sentences/leaderboard', protect, sentenceController.getLeaderboard);

// Sentence management (admin/founder)
router.get('/sentences', protect, sentenceController.getAllSentences);
router.get('/sentences/categories', protect, sentenceController.getCategories);
router.post('/sentences', protect, sentenceController.createSentence);
router.put('/sentences/:id', protect, sentenceController.updateSentence);
router.delete('/sentences/:id', protect, sentenceController.deleteSentence);

module.exports = router;
