const mongoose = require('mongoose');
const StaffPayout = require('../models/SalaryPayout'); // Uses SalaryPayout collection
const StaffEarning = require('../models/TeacherEarning');
const StaffAccount = require('../models/StaffAccount');

/**
 * StaffPayoutService
 * Production-grade payout/withdrawal system
 * CRITICAL: Payouts do NOT modify earnings - only mark them as paid
 */
class StaffPayoutService {
  
  /**
   * ADMIN: Create payout request
   * Withdraws approved earnings
   */
  async createPayout(staffId, earningIds, method, approvedBy, approvedByType, bankDetails = null, notes = null) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Validate earnings
      if (!Array.isArray(earningIds) || earningIds.length === 0) {
        throw new Error('Must select at least one earning for payout');
      }
      
      // Get earnings and validate
      const earnings = await StaffEarning.find({
        _id: { $in: earningIds },
        staffId,
        status: 'approved' // Only approved earnings can be paid
      });
      
      if (earnings.length !== earningIds.length) {
        throw new Error('Some earnings are not approved or do not belong to this staff');
      }
      
      // Calculate total amount
      const totalAmount = earnings.reduce((sum, e) => sum + e.amount, 0);
      
      if (totalAmount <= 0) {
        throw new Error('Total payout amount must be positive');
      }
      
      // Check account balance
      const account = await StaffAccount.getOrCreate(staffId);
      
      if (account.availableForPayout < totalAmount) {
        throw new Error(`Insufficient available balance. Available: ${account.availableForPayout / 100} so'm, Required: ${totalAmount / 100} so'm`);
      }
      
      // Generate reference number
      const referenceNumber = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Calculate metadata
      const dates = earnings.map(e => e.referenceDate).sort();
      const metadata = {
        earningsCount: earnings.length,
        dateRange: {
          from: dates[0],
          to: dates[dates.length - 1]
        }
      };
      
      // Create payout
      const payout = await StaffPayout.create([{
        staffId,
        earningIds,
        amount: totalAmount,
        method,
        bankDetails,
        referenceNumber,
        approvedBy,
        approvedByType,
        notes,
        metadata,
        status: 'pending' // Starts as pending
      }], { session });
      
      // Mark earnings as paid
      for (const earning of earnings) {
        await earning.markAsPaid(payout[0]._id);
      }
      
      // Update account
      await account.processPayout(totalAmount);
      await account.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return payout[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * ADMIN: Complete payout (mark as paid)
   */
  async completePayout(payoutId) {
    const payout = await StaffPayout.findById(payoutId);
    
    if (!payout) {
      throw new Error('Payout not found');
    }
    
    if (payout.status !== 'pending') {
      throw new Error('Only pending payouts can be completed');
    }
    
    await payout.complete();
    return payout;
  }
  
  /**
   * ADMIN: Cancel payout
   */
  async cancelPayout(payoutId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const payout = await StaffPayout.findById(payoutId);
      
      if (!payout) {
        throw new Error('Payout not found');
      }
      
      if (payout.status !== 'pending') {
        throw new Error('Only pending payouts can be cancelled');
      }
      
      if (!reason || reason.length < 10) {
        throw new Error('Cancellation reason must be at least 10 characters');
      }
      
      // Cancel payout
      await payout.cancel(reason);
      
      // Restore earnings to approved status
      await StaffEarning.updateMany(
        { _id: { $in: payout.earningIds } },
        { 
          status: 'approved',
          payoutId: null,
          paidAt: null
        }
      );
      
      // Restore account balance
      const account = await StaffAccount.getOrCreate(payout.staffId);
      account.totalPaidOut -= payout.amount;
      account.availableForPayout += payout.amount;
      account.approvedNotPaid += payout.amount;
      account.statistics.totalPayouts -= 1;
      await account.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return payout;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * GET: Staff payout history
   */
  async getStaffPayouts(staffId, filters = {}) {
    const query = { staffId };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.method) {
      query.method = filters.method;
    }
    
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    const payouts = await StaffPayout.find(query)
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return payouts;
  }
  
  /**
   * GET: All payouts (admin view)
   */
  async getAllPayouts(filters = {}) {
    const query = {};
    
    if (filters.staffId) {
      query.staffId = filters.staffId;
    }
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    const payouts = await StaffPayout.find(query)
      .populate('staffId', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return payouts;
  }
  
  /**
   * GET: Payout by ID
   */
  async getPayoutById(payoutId) {
    const payout = await StaffPayout.findById(payoutId)
      .populate('staffId', 'name email')
      .populate('approvedBy', 'name email')
      .populate('earningIds');
    
    if (!payout) {
      throw new Error('Payout not found');
    }
    
    return payout;
  }
  
  /**
   * GET: Pending payouts for approval
   */
  async getPendingPayouts() {
    const payouts = await StaffPayout.find({ status: 'pending' })
      .populate('staffId', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return payouts;
  }
  
  /**
   * UTILITY: Calculate payout preview (before creating)
   */
  async calculatePayoutPreview(staffId, earningIds) {
    const earnings = await StaffEarning.find({
      _id: { $in: earningIds },
      staffId,
      status: 'approved'
    });
    
    if (earnings.length !== earningIds.length) {
      throw new Error('Some earnings are not approved or do not belong to this staff');
    }
    
    const totalAmount = earnings.reduce((sum, e) => sum + e.amount, 0);
    const dates = earnings.map(e => e.referenceDate).sort();
    
    return {
      earningsCount: earnings.length,
      totalAmount,
      formattedAmount: `${Math.round(totalAmount / 100).toLocaleString('en-US')} so'm`,
      dateRange: {
        from: dates[0],
        to: dates[dates.length - 1]
      },
      earnings: earnings.map(e => ({
        id: e._id,
        amount: e.amount,
        formattedAmount: e.formattedAmount,
        referenceDate: e.referenceDate,
        description: e.description
      }))
    };
  }
}

module.exports = new StaffPayoutService();
