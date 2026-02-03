const express = require('express');
const { body, param } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const {
  getWalletBalance,
  getWalletSummary,
  getTransactionHistory,
  topUpWallet,
  confirmTopUp,
  failTopUp,
  processClassDeduction,
  applyStudentPenalty,
  processRefund,
  adjustWallet,
  lockWallet,
  unlockWallet
} = require('../controllers/walletController');

const router = express.Router();

// ========== READ OPERATIONS ==========

// Get wallet balance
router.get('/balance/:ownerId/:ownerType', 
  protect, 
  enforceBranchIsolation,
  param('ownerId').isMongoId(),
  param('ownerType').isIn(['student', 'parent']),
  getWalletBalance
);

// Get wallet summary
router.get('/summary/:ownerId/:ownerType', 
  protect,
  enforceBranchIsolation,
  param('ownerId').isMongoId(),
  param('ownerType').isIn(['student', 'parent']),
  getWalletSummary
);

// Get transaction history
router.get('/transactions/:ownerId/:ownerType', 
  protect,
  enforceBranchIsolation,
  param('ownerId').isMongoId(),
  param('ownerType').isIn(['student', 'parent']),
  getTransactionHistory
);

// ========== TOP-UP OPERATIONS ==========

// Top up wallet - Students can top up their own, admins can top up any
// Amount should be in so'm (will be converted to tyiyn internally)
router.post('/top-up', 
  protect,
  enforceBranchIsolation,
  body('ownerId').isMongoId().withMessage('Valid owner ID required'),
  body('ownerType').isIn(['student', 'parent']).withMessage('Owner type must be student or parent'),
  body('amount')
    .isFloat({ min: 10000 })
    .withMessage('Minimum top-up amount is 10,000 soʻm')
    .isFloat({ max: 2000000 })
    .withMessage('Maximum top-up amount is 2,000,000 soʻm'),
  body('paymentMethod')
    .isIn(['card', 'uzcard', 'humo', 'click', 'payme', 'cash', 'bank-transfer'])
    .withMessage('Invalid payment method'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason too long'),
  topUpWallet
);

// Confirm pending top-up - Admin/Receptionist only
router.patch('/top-up/:transactionId/confirm',
  protect,
  authorize('admin', 'founder', 'receptionist', 'manager'),
  enforceBranchIsolation,
  param('transactionId').isMongoId(),
  confirmTopUp
);

// Fail/reject pending top-up - Admin/Receptionist only
router.patch('/top-up/:transactionId/fail',
  protect,
  authorize('admin', 'founder', 'receptionist', 'manager'),
  enforceBranchIsolation,
  param('transactionId').isMongoId(),
  body('reason').isLength({ min: 5 }).withMessage('Failure reason required'),
  failTopUp
);

// ========== AUTOMATED DEDUCTIONS ==========

// Process class deduction - Auto-called by attendance system
router.post('/class-deduction',
  protect,
  authorize('admin', 'teacher', 'founder'),
  enforceBranchIsolation,
  body('classId').isMongoId(),
  body('studentId').isMongoId(),
  processClassDeduction
);

// ========== ADMIN OPERATIONS ==========

// Apply student penalty - Admin/Founder only
router.post('/penalty',
  protect,
  authorize('admin', 'founder'),
  enforceBranchIsolation,
  body('studentId').isMongoId().withMessage('Valid student ID required'),
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Minimum penalty is 1 soʻm (100 tyiyn)'),
  body('reason')
    .isLength({ min: 5, max: 500 })
    .withMessage('Detailed reason required (5-500 characters)'),
  applyStudentPenalty
);

// Process refund - Admin/Founder only
router.post('/refund',
  protect,
  authorize('admin', 'founder'),
  enforceBranchIsolation,
  body('studentId').isMongoId().withMessage('Valid student ID required'),
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Minimum refund is 1 soʻm (100 tyiyn)'),
  body('reason')
    .isLength({ min: 5, max: 500 })
    .withMessage('Detailed reason required (5-500 characters)'),
  body('originalTransactionId').optional().isMongoId(),
  processRefund
);

// Manual wallet adjustment - Admin/Founder only
router.post('/adjustment',
  protect,
  authorize('admin', 'founder'),
  enforceBranchIsolation,
  body('walletId').isMongoId().withMessage('Valid wallet ID required'),
  body('amount')
    .isFloat({ min: 100 })
    .withMessage('Minimum adjustment is 1 soʻm (100 tyiyin)'),
  body('direction')
    .isIn(['credit', 'debit'])
    .withMessage('Direction must be credit or debit'),
  body('reason')
    .isLength({ min: 10, max: 500 })
    .withMessage('Detailed reason required (10-500 characters)'),
  body('originalTransactionId').optional().isMongoId(),
  adjustWallet
);

// Lock wallet - Admin/Founder only
router.patch('/lock/:walletId',
  protect,
  authorize('admin', 'founder'),
  enforceBranchIsolation,
  param('walletId').isMongoId(),
  body('reason')
    .isLength({ min: 5, max: 500 })
    .withMessage('Lock reason required (5-500 characters)'),
  lockWallet
);

// Unlock wallet - Admin/Founder only
router.patch('/unlock/:walletId',
  protect,
  authorize('admin', 'founder'),
  enforceBranchIsolation,
  param('walletId').isMongoId(),
  unlockWallet
);

module.exports = router;
