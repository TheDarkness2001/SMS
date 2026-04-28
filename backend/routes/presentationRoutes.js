const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  recordPresentation,
  getStudentPresentations,
  getMonthlyPresentations,
  getTopPresenters
} = require('../controllers/presentationController');

router.post('/', protect, recordPresentation);
router.get('/student/:studentId', protect, getStudentPresentations);
router.get('/monthly', protect, getMonthlyPresentations);
router.get('/top', protect, getTopPresenters);

module.exports = router;
