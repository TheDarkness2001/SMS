const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Student = require('../models/Student');
const Class = require('../models/Class');
const mongoose = require('mongoose');

/**
 * Production-Grade Wallet Service for Uzbekistan
 * - All amounts in UZS (tyiyn) as integers
 * - Immutable transactions with audit trail
 * - Atomic operations with rollback support
 * - Role-based access control
 */
class WalletService {
  /**
   * Top-up amount limits (in tyiyn)
   * 1 so'm = 100 tyiyn
   */
  static LIMITS = {
    MIN_TOPUP: 1000000,      // 10,000 so'm minimum
    MAX_TOPUP: 200000000,    // 2,000,000 so'm maximum
    DAILY_TOPUP_LIMIT: 500000000  // 5,000,000 so'm daily limit
  };

  /**
   * Get or create wallet for a user
   */
  async getOrCreateWallet(ownerId, ownerType, initialBalance = 0) {
    let wallet = await Wallet.findOne({ ownerId, ownerType });
    
    if (!wallet) {
      wallet = await Wallet.create({
        ownerId,
        ownerType,
        balance: Math.round(initialBalance),
        availableBalance: Math.round(initialBalance),
        pendingBalance: 0,
        currency: 'UZS'
      });
    }
    
    return wallet;
  }

  /**
   * Validate top-up amount and daily limit
   */
  async validateTopUp(ownerId, ownerType, amount) {
    // Validate amount range
    if (amount < WalletService.LIMITS.MIN_TOPUP) {
      throw new Error(`Minimum top-up amount is ${WalletService.LIMITS.MIN_TOPUP / 100} so'm`);
    }
    
    if (amount > WalletService.LIMITS.MAX_TOPUP) {
      throw new Error(`Maximum top-up amount is ${WalletService.LIMITS.MAX_TOPUP / 100} so'm`);
    }

    // Check daily limit
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTopUps = await WalletTransaction.aggregate([
      {
        $match: {
          walletId: wallet._id,
          transactionType: 'top-up',
          status: { $in: ['pending', 'completed'] },
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const todayTotal = todayTopUps[0]?.total || 0;
    
    if (todayTotal + amount > WalletService.LIMITS.DAILY_TOPUP_LIMIT) {
      const remaining = WalletService.LIMITS.DAILY_TOPUP_LIMIT - todayTotal;
      throw new Error(`Daily top-up limit exceeded. Remaining: ${remaining / 100} so'm`);
    }

    return true;
  }

  /**
   * Add funds to wallet (top-up) with pending status
   * Funds go to pendingBalance until confirmed
   */
  async topUpWallet(ownerId, ownerType, amount, createdBy, createdByType, paymentMethod = 'cash', reason = 'Wallet top-up') {
    amount = Math.round(amount);
    
    // Validate amount
    await this.validateTopUp(ownerId, ownerType, amount);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await this.getOrCreateWallet(ownerId, ownerType);

      // Check if wallet is locked
      if (wallet.isLocked) {
        throw new Error(`Wallet is locked: ${wallet.lockReason}`);
      }

      // Add to pending balance
      wallet.pendingBalance += amount;
      wallet.lastTransactionAt = new Date();
      await wallet.save({ session });

      // Create pending transaction
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        transactionType: 'top-up',
        amount,
        direction: 'credit',
        status: 'pending',
        balanceAfterTransaction: wallet.balance,
        availableBalanceAfter: wallet.availableBalance,
        pendingBalanceAfter: wallet.pendingBalance,
        createdBy,
        createdByType,
        recordedBy: createdBy, // Legacy
        recordedByType: createdByType, // Legacy
        paymentMethod,
        reason,
        confirmationNumber: `TOPUP-${Date.now()}-${wallet._id.toString().slice(-6)}`,
        metadata: {
          dailyTotal: (await this.getTodayTopUpTotal(wallet._id)) + amount
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      return { wallet, transaction: transaction[0] };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Confirm pending top-up (move from pending to available)
   */
  async confirmTopUp(transactionId, confirmedBy, confirmedByType) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transaction = await WalletTransaction.findById(transactionId);
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== 'pending') {
        throw new Error(`Cannot confirm transaction with status: ${transaction.status}`);
      }

      if (transaction.transactionType !== 'top-up') {
        throw new Error('Only top-up transactions can be confirmed');
      }

      const wallet = await Wallet.findById(transaction.walletId);
      
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Move from pending to available
      wallet.pendingBalance -= transaction.amount;
      wallet.availableBalance += transaction.amount;
      wallet.lastTransactionAt = new Date();
      await wallet.save({ session });

      // Update transaction status
      transaction.status = 'completed';
      transaction.availableBalanceAfter = wallet.availableBalance;
      transaction.pendingBalanceAfter = wallet.pendingBalance;
      transaction.balanceAfterTransaction = wallet.balance;
      transaction.notes = `Confirmed by ${confirmedByType} at ${new Date().toISOString()}`;
      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      return { wallet, transaction };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Fail/reject a pending top-up
   */
  async failTopUp(transactionId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transaction = await WalletTransaction.findById(transactionId);
      
      if (!transaction || transaction.status !== 'pending') {
        throw new Error('Invalid transaction');
      }

      const wallet = await Wallet.findById(transaction.walletId);
      
      // Remove from pending balance
      wallet.pendingBalance -= transaction.amount;
      await wallet.save({ session });

      // Mark transaction as failed
      transaction.status = 'failed';
      transaction.availableBalanceAfter = wallet.availableBalance;
      transaction.pendingBalanceAfter = wallet.pendingBalance;
      transaction.notes = `Failed: ${reason}`;
      await transaction.save({ session });

      await session.commitTransaction();
      session.endSession();

      return { wallet, transaction };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Deduct funds for class completion (from availableBalance)
   */
  async deductClassFee(classId, studentId, createdBy, createdByType) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const classRecord = await Class.findById(classId).populate('subjectId');
      const student = await Student.findById(studentId);
      
      if (!classRecord || !student) {
        throw new Error('Class or student not found');
      }

      // Get per-class price (student-specific or subject default)
      const perClassPrice = Math.round(
        student.perClassPrices?.[classRecord.subjectId.toString()] || 
        classRecord.subjectId.pricePerClass || 
        0
      );

      if (perClassPrice <= 0) {
        throw new Error('No price defined for this class');
      }

      const wallet = await this.getOrCreateWallet(studentId, 'student');
      
      // Check if wallet is locked
      if (wallet.isLocked) {
        throw new Error(`Wallet is locked: ${wallet.lockReason}`);
      }

      // Check if sufficient balance (use canDeduct method)
      if (!wallet.canDeduct(perClassPrice)) {
        const available = wallet.availableBalance + wallet.graceBalance;
        throw new Error(`Insufficient balance. Available: ${available / 100} so'm, Required: ${perClassPrice / 100} so'm`);
      }

      // Deduct from available balance
      wallet.availableBalance -= perClassPrice;
      wallet.lastTransactionAt = new Date();
      await wallet.save({ session });

      // Create transaction record
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        transactionType: 'class-deduction',
        amount: perClassPrice,
        direction: 'debit',
        status: 'completed',
        balanceAfterTransaction: wallet.balance,
        availableBalanceAfter: wallet.availableBalance,
        pendingBalanceAfter: wallet.pendingBalance,
        referenceId: classId,
        referenceModel: 'Class',
        createdBy,
        createdByType,
        recordedBy: createdBy,
        recordedByType: createdByType,
        reason: `Class fee for ${classRecord.subjectId.name}`,
        confirmationNumber: `CLASS-${Date.now()}-${classId.toString().slice(-6)}`,
        metadata: {
          className: classRecord.subjectId.name,
          studentName: student.name
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      return { wallet, transaction: transaction[0] };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Apply penalty to student (admin/founder only)
   */
  async applyStudentPenalty(studentId, amount, reason, createdBy, createdByType) {
    amount = Math.round(amount);
    
    if (amount <= 0) {
      throw new Error('Penalty amount must be positive');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('Penalty requires a detailed reason (minimum 5 characters)');
    }

    // Only admin/founder can apply penalties
    if (!['admin', 'founder'].includes(createdByType)) {
      throw new Error('Only admin or founder can apply penalties');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await this.getOrCreateWallet(studentId, 'student');
      
      // Check if wallet is locked
      if (wallet.isLocked) {
        throw new Error(`Wallet is locked: ${wallet.lockReason}`);
      }

      // Deduct from available balance (allow grace balance)
      if (!wallet.canDeduct(amount)) {
        throw new Error('Insufficient balance for penalty');
      }

      wallet.availableBalance -= amount;
      wallet.lastTransactionAt = new Date();
      await wallet.save({ session });

      // Create transaction record
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        transactionType: 'penalty',
        amount,
        direction: 'debit',
        status: 'completed',
        balanceAfterTransaction: wallet.balance,
        availableBalanceAfter: wallet.availableBalance,
        pendingBalanceAfter: wallet.pendingBalance,
        reason,
        createdBy,
        createdByType,
        recordedBy: createdBy,
        recordedByType: createdByType,
        confirmationNumber: `PEN-${Date.now()}-${wallet._id.toString().slice(-6)}`,
        metadata: {
          appliedBy: createdByType
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      return { wallet, transaction: transaction[0] };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Process refund to student (admin/founder only)
   */
  async processRefund(studentId, amount, reason, createdBy, createdByType, originalTransactionId = null) {
    amount = Math.round(amount);
    
    if (amount <= 0) {
      throw new Error('Refund amount must be positive');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('Refund requires a detailed reason (minimum 5 characters)');
    }

    // Only admin/founder can process refunds
    if (!['admin', 'founder'].includes(createdByType)) {
      throw new Error('Only admin or founder can process refunds');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await this.getOrCreateWallet(studentId, 'student');
      
      // Add to available balance
      wallet.availableBalance += amount;
      wallet.lastTransactionAt = new Date();
      await wallet.save({ session });

      // Create transaction record
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        transactionType: 'refund',
        amount,
        direction: 'credit',
        status: 'completed',
        balanceAfterTransaction: wallet.balance,
        availableBalanceAfter: wallet.availableBalance,
        pendingBalanceAfter: wallet.pendingBalance,
        originalTransactionId,
        reason,
        createdBy,
        createdByType,
        recordedBy: createdBy,
        recordedByType: createdByType,
        confirmationNumber: `REF-${Date.now()}-${wallet._id.toString().slice(-6)}`,
        metadata: {
          refundedBy: createdByType
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      return { wallet, transaction: transaction[0] };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Manual wallet adjustment (admin/founder only)
   */
  async adjustWallet(walletId, amount, direction, reason, createdBy, createdByType, originalTransactionId = null) {
    amount = Math.round(amount);
    
    if (amount <= 0) {
      throw new Error('Adjustment amount must be positive');
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error('Adjustment requires a detailed reason (minimum 10 characters)');
    }

    // Only admin/founder can make adjustments
    if (!['admin', 'founder'].includes(createdByType)) {
      throw new Error('Only admin or founder can make wallet adjustments');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await Wallet.findById(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Update balance based on direction
      if (direction === 'credit') {
        wallet.availableBalance += amount;
      } else if (direction === 'debit') {
        if (!wallet.canDeduct(amount)) {
          throw new Error('Insufficient balance for debit adjustment');
        }
        wallet.availableBalance -= amount;
      } else {
        throw new Error('Invalid direction. Use credit or debit.');
      }

      wallet.lastTransactionAt = new Date();
      await wallet.save({ session });

      // Create transaction record
      const transaction = await WalletTransaction.create([{
        walletId: wallet._id,
        transactionType: 'adjustment',
        amount,
        direction,
        status: 'completed',
        balanceAfterTransaction: wallet.balance,
        availableBalanceAfter: wallet.availableBalance,
        pendingBalanceAfter: wallet.pendingBalance,
        reason,
        createdBy,
        createdByType,
        recordedBy: createdBy,
        recordedByType: createdByType,
        originalTransactionId,
        confirmationNumber: `ADJ-${Date.now()}-${wallet._id.toString().slice(-6)}`,
        metadata: {
          adjustedBy: createdByType
        }
      }], { session });

      await session.commitTransaction();
      session.endSession();

      return { wallet, transaction: transaction[0] };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(ownerId, ownerType) {
    const wallet = await Wallet.findOne({ ownerId, ownerType });
    return wallet ? {
      balance: wallet.balance,
      availableBalance: wallet.availableBalance,
      pendingBalance: wallet.pendingBalance
    } : {
      balance: 0,
      availableBalance: 0,
      pendingBalance: 0
    };
  }

  /**
   * Get transaction history with pagination
   */
  async getTransactionHistory(ownerId, ownerType, limit = 50, page = 1) {
    const wallet = await Wallet.findOne({ ownerId, ownerType });
    if (!wallet) {
      return { transactions: [], total: 0, page, limit };
    }

    const skip = (page - 1) * limit;
    const transactions = await WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .lean();

    const total = await WalletTransaction.countDocuments({ walletId: wallet._id });

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get wallet summary with statistics
   */
  async getWalletSummary(ownerId, ownerType) {
    const wallet = await Wallet.findOne({ ownerId, ownerType });
    if (!wallet) {
      return null;
    }

    // Calculate transaction statistics
    const transactionStats = await WalletTransaction.aggregate([
      { $match: { walletId: wallet._id, status: 'completed' } },
      {
        $group: {
          _id: '$transactionType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      balance: wallet.balance,
      availableBalance: wallet.availableBalance,
      pendingBalance: wallet.pendingBalance,
      currency: wallet.currency,
      graceBalance: wallet.graceBalance,
      isLocked: wallet.isLocked,
      lockReason: wallet.lockReason,
      transactionStats,
      lastTransactionAt: wallet.lastTransactionAt,
      lastUpdated: wallet.updatedAt
    };
  }

  /**
   * Get today's total top-up amount
   */
  async getTodayTopUpTotal(walletId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await WalletTransaction.aggregate([
      {
        $match: {
          walletId,
          transactionType: 'top-up',
          status: { $in: ['pending', 'completed'] },
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return result[0]?.total || 0;
  }

  /**
   * Lock wallet (admin/founder only)
   */
  async lockWallet(walletId, reason, lockedBy, lockedByType) {
    if (!['admin', 'founder'].includes(lockedByType)) {
      throw new Error('Only admin or founder can lock wallets');
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.lock(reason, lockedBy);
    await wallet.save();

    return wallet;
  }

  /**
   * Unlock wallet (admin/founder only)
   */
  async unlockWallet(walletId, unlockedByType) {
    if (!['admin', 'founder'].includes(unlockedByType)) {
      throw new Error('Only admin or founder can unlock wallets');
    }

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.unlock();
    await wallet.save();

    return wallet;
  }
}

module.exports = new WalletService();
