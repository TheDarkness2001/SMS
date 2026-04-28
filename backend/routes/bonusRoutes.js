const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  calculateMonthlyBonuses,
  distributeBonuses,
  getBonusHistory
} = require('../controllers/bonusController');

router.get('/calculate', protect, calculateMonthlyBonuses);
router.post('/distribute', protect, distributeBonuses);
router.get('/history', protect, getBonusHistory);

module.exports = router;
