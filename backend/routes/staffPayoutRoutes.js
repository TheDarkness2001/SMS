const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const staffPayoutController = require('../controllers/staffPayoutController');

/**
 * Staff Payout Routes
 * All routes require authentication
 * Role-based access enforced in controller
 */

// Get payouts (teachers: own, admin/manager: any)
router.get('/', protect, enforceBranchIsolation, staffPayoutController.getPayouts);

// Get pending payouts (admin/manager only)
router.get('/pending/list', protect, enforceBranchIsolation, staffPayoutController.getPendingPayouts);

// Calculate payout preview (admin/manager only)
router.post('/preview', protect, enforceBranchIsolation, staffPayoutController.calculatePayoutPreview);

// Create payout (admin/manager only)
router.post('/', protect, enforceBranchIsolation, staffPayoutController.createPayout);

// Get payout by ID
router.get('/:id', protect, enforceBranchIsolation, staffPayoutController.getPayoutById);

// Complete payout (admin/founder only)
router.patch('/:id/complete', protect, enforceBranchIsolation, staffPayoutController.completePayout);

// Cancel payout (admin/founder only)
router.patch('/:id/cancel', protect, enforceBranchIsolation, staffPayoutController.cancelPayout);

module.exports = router;
