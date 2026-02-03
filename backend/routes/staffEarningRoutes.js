const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const staffEarningController = require('../controllers/staffEarningController');

/**
 * Staff Earning Routes
 * All routes require authentication
 * Role-based access enforced in controller
 */

// Get earnings (teachers: own, admin/manager: any)
router.get('/', protect, enforceBranchIsolation, staffEarningController.getEarnings);

// Get account summary
router.get('/account', protect, enforceBranchIsolation, staffEarningController.getAccount);

// Get pending earnings (admin/manager only)
router.get('/pending', protect, enforceBranchIsolation, staffEarningController.getPendingEarnings);

// Approve earning (admin/manager only)
router.patch('/:id/approve', protect, enforceBranchIsolation, staffEarningController.approveEarning);

// Apply bonus (admin/founder only)
router.post('/bonus', protect, enforceBranchIsolation, staffEarningController.applyBonus);

// Apply penalty (admin/founder only)
router.post('/penalty', protect, enforceBranchIsolation, staffEarningController.applyPenalty);

// Apply adjustment (admin/founder only)
router.post('/adjustment', protect, enforceBranchIsolation, staffEarningController.applyAdjustment);

// Recalculate account (admin/founder only - audit)
router.post('/:staffId/recalculate', protect, enforceBranchIsolation, staffEarningController.recalculateAccount);

module.exports = router;
