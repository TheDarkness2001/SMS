const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const salaryPayoutController = require('../controllers/salaryPayoutController');

/**
 * Simplified Salary Payout Routes
 * Record direct payments to staff
 * All routes require authentication
 */

// Get payouts (teachers: own, admin/manager/founder: all)
router.get('/', protect, salaryPayoutController.getPayouts);

// Create payout (admin/manager/founder only)
router.post('/', protect, salaryPayoutController.createPayout);

// Get payout by ID
router.get('/:id', protect, salaryPayoutController.getPayoutById);

// Complete payout (admin/founder only)
router.patch('/:id/complete', protect, salaryPayoutController.completePayout);

// Cancel payout (admin/founder only)
router.patch('/:id/cancel', protect, salaryPayoutController.cancelPayout);

module.exports = router;
