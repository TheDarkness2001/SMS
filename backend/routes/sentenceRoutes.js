const express = require('express');
const router = express.Router();
const sentenceController = require('../controllers/sentenceController');
const { authenticate } = require('../middleware/auth');

// Public practice routes (student or teacher)
router.get('/sentences/random', authenticate, sentenceController.getRandomSentence);
router.post('/sentences/check', authenticate, sentenceController.checkSentenceAnswer);
router.get('/sentences/progress', authenticate, sentenceController.getStudentSentenceProgress);
router.post('/sentences/submit-result', authenticate, sentenceController.submitPracticeResult);
router.get('/sentences/leaderboard', authenticate, sentenceController.getLeaderboard);

// Sentence management (admin/founder)
router.get('/sentences', authenticate, sentenceController.getAllSentences);
router.get('/sentences/categories', authenticate, sentenceController.getCategories);
router.post('/sentences', authenticate, sentenceController.createSentence);
router.put('/sentences/:id', authenticate, sentenceController.updateSentence);
router.delete('/sentences/:id', authenticate, sentenceController.deleteSentence);

module.exports = router;
