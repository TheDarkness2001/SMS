const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const {
  createEarningForClass,
  getTeacherEarnings,
  getTeacherEarningsSummary,
  markEarningsAsPaid,
  applyTeacherPenalty,
  lockEarningsAfterPeriod,
  getSalaryPayoutHistory
} = require('../controllers/teacherEarningController');
const { 
  validateEarningsOwnership,
  blockTeacherAccess,
  forceTeacherIdInBody 
} = require('../middleware/teacherSecurity');

const router = express.Router();

// Create earning for completed class - ONLY admin can create earnings
// Teachers CANNOT create their own earnings (prevents fraud)
router.post('/',
  protect,
  blockTeacherAccess,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  body('classId').isMongoId(),
  body('teacherId').isMongoId(),
  body('subject').isString().trim().isLength({ min: 1, max: 100 }),
  body('amount').isFloat({ min: 0.01 }),
  body('classDate').isISO8601(),
  createEarningForClass
);

// Get teacher earnings - teacher can ONLY access THEIR OWN earnings
router.get('/:teacherId',
  protect,
  validateEarningsOwnership,
  enforceBranchIsolation,
  getTeacherEarnings
);

// Get teacher earnings summary - teacher can ONLY access THEIR OWN summary
router.get('/summary/:teacherId',
  protect,
  validateEarningsOwnership,
  enforceBranchIsolation,
  getTeacherEarningsSummary
);

// Mark earnings as paid - admin only (teachers CANNOT mark their own as paid)
router.put('/pay',
  protect,
  blockTeacherAccess,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  body('earningIds').isArray({ min: 1 }),
  body('earningIds.*').isMongoId(),
  body('teacherId').isMongoId(),
  body('paymentMethod').isIn(['cash', 'bank-transfer', 'check', 'online']),
  body('referenceNumber').optional().isString().trim().isLength({ max: 100 }),
  body('notes').optional().isString().trim().isLength({ max: 500 }),
  markEarningsAsPaid
);

// Apply teacher penalty - admin only (teachers CANNOT modify penalties)
router.post('/penalty',
  protect,
  blockTeacherAccess,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  body('teacherId').isMongoId(),
  body('amount').isFloat({ min: 0.01 }),
  body('reason').isString().trim().isLength({ min: 1, max: 200 }),
  applyTeacherPenalty
);

// Lock earnings after period - admin only (teachers CANNOT lock earnings)
router.put('/lock-earnings',
  protect,
  blockTeacherAccess,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  body('teacherId').isMongoId(),
  body('daysToLock').optional().isInt({ min: 1, max: 365 }),
  lockEarningsAfterPeriod
);

// Get salary payout history - teacher can ONLY access THEIR OWN history
router.get('/payouts/:teacherId',
  protect,
  validateEarningsOwnership,
  enforceBranchIsolation,
  getSalaryPayoutHistory
);

module.exports = router;