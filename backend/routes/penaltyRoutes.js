const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPenalty,
  getStudentPenalties,
  getGroupPenalties,
  getMonthlyPenalties,
  revertPenalty
} = require('../controllers/penaltyController');

router.post('/', protect, createPenalty);
router.get('/student/:studentId', protect, getStudentPenalties);
router.get('/group/:groupId', protect, getGroupPenalties);
router.get('/monthly', protect, getMonthlyPenalties);
router.patch('/:id/revert', protect, revertPenalty);

module.exports = router;
