const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const walletService = require('../services/walletService');
const { validationResult } = require('express-validator');

/**
 * Get wallet balance (accessible by owner and admins)
 */
const getWalletBalance = async (req, res) => {
  try {
    const { ownerId, ownerType } = req.params;
    
    // Check authorization
    if (!canAccessWallet(req.user, ownerId, ownerType)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const balance = await walletService.getWalletBalance(ownerId, ownerType);
    
    res.status(200).json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get wallet summary (accessible by owner and admins)
 */
const getWalletSummary = async (req, res) => {
  try {
    const { ownerId, ownerType } = req.params;
    
    // Check authorization
    if (!canAccessWallet(req.user, ownerId, ownerType)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const summary = await walletService.getWalletSummary(ownerId, ownerType);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get transaction history (accessible by owner and admins)
 */
const getTransactionHistory = async (req, res) => {
  try {
    const { ownerId, ownerType } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    // Check authorization
    if (!canAccessWallet(req.user, ownerId, ownerType)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const history = await walletService.getTransactionHistory(
      ownerId, 
      ownerType, 
      parseInt(limit), 
      parseInt(page)
    );
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Top up wallet (students can top up their own, admins can top up any)
 */
const topUpWallet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { ownerId, ownerType, amount, paymentMethod, reason } = req.body;
    const createdBy = req.user._id;
    const createdByType = req.user.userType || req.user.role;

    // Students can only top up their own wallet
    if (createdByType === 'student' && ownerId !== createdBy.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Students can only top up their own wallet'
      });
    }

    // Convert amount to tyiyn (integers)
    const amountInTyiyn = Math.round(parseFloat(amount) * 100);

    const result = await walletService.topUpWallet(
      ownerId,
      ownerType,
      amountInTyiyn,
      createdBy,
      createdByType,
      paymentMethod,
      reason || 'Wallet top-up'
    );

    res.status(200).json({
      success: true,
      message: 'Top-up pending. Please confirm payment.',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Confirm top-up (admin/receptionist only)
 */
const confirmTopUp = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const createdBy = req.user._id;
    const createdByType = req.user.userType || req.user.role;

    // Only admin, founder, receptionist can confirm
    if (!['admin', 'founder', 'receptionist', 'manager'].includes(createdByType)) {
      return res.status(403).json({
        success: false,
        message: 'Only authorized staff can confirm top-ups'
      });
    }

    const result = await walletService.confirmTopUp(transactionId, createdBy, createdByType);

    res.status(200).json({
      success: true,
      message: 'Top-up confirmed successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Fail/reject top-up (admin/receptionist only)
 */
const failTopUp = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;

    // Only admin, founder, receptionist can fail top-ups
    const userType = req.user.userType || req.user.role;
    if (!['admin', 'founder', 'receptionist', 'manager'].includes(userType)) {
      return res.status(403).json({
        success: false,
        message: 'Only authorized staff can reject top-ups'
      });
    }

    const result = await walletService.failTopUp(transactionId, reason || 'Payment not received');

    res.status(200).json({
      success: true,
      message: 'Top-up rejected',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Process class deduction (admin/teacher only, called automatically)
 */
const processClassDeduction = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { classId, studentId } = req.body;
    const createdBy = req.user._id;
    const createdByType = req.user.userType || req.user.role;

    const result = await walletService.deductClassFee(
      classId,
      studentId,
      createdBy,
      createdByType
    );

    res.status(200).json({
      success: true,
      message: 'Class fee deducted successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Apply student penalty (admin/founder only)
 */
const applyStudentPenalty = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { studentId, amount, reason } = req.body;
    const createdBy = req.user._id;
    const createdByType = req.user.userType || req.user.role;

    // Only admin/founder can apply penalties
    if (!['admin', 'founder'].includes(createdByType)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can apply penalties'
      });
    }

    // Convert amount to tyiyn
    const amountInTyiyn = Math.round(parseFloat(amount) * 100);

    const result = await walletService.applyStudentPenalty(
      studentId,
      amountInTyiyn,
      reason,
      createdBy,
      createdByType
    );

    res.status(200).json({
      success: true,
      message: 'Penalty applied successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Process refund (admin/founder only)
 */
const processRefund = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { studentId, amount, reason, originalTransactionId } = req.body;
    const createdBy = req.user._id;
    const createdByType = req.user.userType || req.user.role;

    // Only admin/founder can process refunds
    if (!['admin', 'founder'].includes(createdByType)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can process refunds'
      });
    }

    // Convert amount to tyiyn
    const amountInTyiyn = Math.round(parseFloat(amount) * 100);

    const result = await walletService.processRefund(
      studentId,
      amountInTyiyn,
      reason,
      createdBy,
      createdByType,
      originalTransactionId
    );

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Manual wallet adjustment (admin/founder only)
 */
const adjustWallet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { walletId, amount, direction, reason, originalTransactionId } = req.body;
    const createdBy = req.user._id;
    const createdByType = req.user.userType || req.user.role;

    // Only admin/founder can make adjustments
    if (!['admin', 'founder'].includes(createdByType)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can make wallet adjustments'
      });
    }

    // Convert amount to tyiyn
    const amountInTyiyn = Math.round(parseFloat(amount) * 100);

    const result = await walletService.adjustWallet(
      walletId,
      amountInTyiyn,
      direction,
      reason,
      createdBy,
      createdByType,
      originalTransactionId
    );

    res.status(200).json({
      success: true,
      message: 'Wallet adjusted successfully',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Lock wallet (admin/founder only)
 */
const lockWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { reason } = req.body;
    const lockedBy = req.user._id;
    const lockedByType = req.user.userType || req.user.role;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Lock reason is required'
      });
    }

    const wallet = await walletService.lockWallet(walletId, reason, lockedBy, lockedByType);

    res.status(200).json({
      success: true,
      message: 'Wallet locked successfully',
      data: wallet
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Unlock wallet (admin/founder only)
 */
const unlockWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const unlockedByType = req.user.userType || req.user.role;

    const wallet = await walletService.unlockWallet(walletId, unlockedByType);

    res.status(200).json({
      success: true,
      message: 'Wallet unlocked successfully',
      data: wallet
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Helper function to check if user can access wallet
 */
function canAccessWallet(user, ownerId, ownerType) {
  const userType = user.userType || user.role;
  
  // Admins and founders can access all wallets
  if (['admin', 'founder', 'manager'].includes(userType)) {
    return true;
  }
  
  // Teachers with canViewPayments permission can view wallets
  if (userType === 'teacher' && user.permissions?.canViewPayments) {
    return true;
  }
  
  // Students can only access their own wallet
  if (userType === 'student' && ownerType === 'student') {
    return user._id.toString() === ownerId;
  }
  
  return false;
}

module.exports = {
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
};
