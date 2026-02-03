const mongoose = require('mongoose');
const StaffEarning = require('../models/TeacherEarning'); // Uses TeacherEarning collection
const StaffAccount = require('../models/StaffAccount');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

/**
 * StaffEarningService
 * Production-grade payroll & commission system
 * CRITICAL RULES:
 * 1. Earnings are EARNED, not prepaid
 * 2. All amounts in UZS (tyiyin)
 * 3. Immutable records with audit trail
 * 4. Automatic generation on class completion
 * 5. Approval workflow: pending → approved → paid
 */
class StaffEarningService {
  
  /**
   * AUTO-GENERATE: Create earning when class is completed and paid
   * This is called automatically after student payment confirmed
   */
  async createEarningForClass(classId, teacherId, studentId, createdBy, createdByType = 'system') {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Get class details
      const classRecord = await Class.findById(classId)
        .populate('teacherId')
        .populate('subjectId');
      
      if (!classRecord) {
        throw new Error('Class not found');
      }
      
      // Get teacher earning rate
      const teacher = await Teacher.findById(teacherId);
      if (!teacher || !teacher.perClassEarning) {
        throw new Error(`No earning rate defined for teacher ${teacher?.name || teacherId}`);
      }
      
      const amount = Math.round(teacher.perClassEarning * 100); // Convert to tyiyin
      
      // Check if earning already exists for this class
      const existingEarning = await StaffEarning.findOne({ 
        classId, 
        staffId: teacherId 
      });
      
      if (existingEarning) {
        throw new Error('Earning already exists for this class');
      }
      
      // Create earning record
      const earning = await StaffEarning.create([{
        staffId: teacherId,
        classId,
        studentId,
        amount,
        earningType: 'per-class',
        status: 'pending', // Requires approval
        referenceDate: classRecord.date,
        description: `${classRecord.subjectId.name} - ${classRecord.date.toISOString().split('T')[0]}`,
        createdBy,
        createdByType,
        branchId: teacher.branchId // Use teacher's branch
      }], { session });
      
      // Update staff account summary
      const account = await StaffAccount.getOrCreate(teacherId);
      await account.addEarning(amount, 'pending');
      await account.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return earning[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * ADMIN: Approve pending earning
   * Only admin/manager can approve
   */
  async approveEarning(earningId, approvedBy, approvedByType) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const earning = await StaffEarning.findById(earningId);
      
      if (!earning) {
        throw new Error('Earning not found');
      }
      
      if (earning.status !== 'pending') {
        throw new Error('Only pending earnings can be approved');
      }
      
      // Approve earning
      await earning.approve(approvedBy);
      
      // Update staff account
      const account = await StaffAccount.getOrCreate(earning.staffId);
      await account.approveEarning(earning.amount);
      await account.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return earning;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * ADMIN: Apply bonus (positive adjustment)
   */
  async applyBonus(staffId, amount, reason, createdBy, createdByType) {
    amount = Math.round(amount);
    
    if (amount <= 0) {
      throw new Error('Bonus amount must be positive');
    }
    
    if (!reason || reason.length < 10) {
      throw new Error('Reason must be at least 10 characters');
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create bonus earning
      const earning = await StaffEarning.create([{
        staffId,
        amount,
        earningType: 'bonus',
        status: 'approved', // Bonus is auto-approved
        referenceDate: new Date(),
        description: 'Bonus',
        reason,
        createdBy,
        createdByType,
        approvedBy: createdBy,
        approvedAt: new Date(),
        branchId: null // Get from teacher doc if needed
      }], { session });
      
      // Get teacher's branch
      const teacher = await Teacher.findById(staffId);
      if (teacher && teacher.branchId) {
        earning[0].branchId = teacher.branchId;
        await earning[0].save({ session });
      }
      
      // Update account
      const account = await StaffAccount.getOrCreate(staffId);
      await account.addEarning(amount, 'approved');
      account.statistics.totalBonuses += 1;
      await account.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return earning[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * ADMIN: Apply penalty (negative adjustment)
   */
  async applyPenalty(staffId, amount, reason, createdBy, createdByType) {
    amount = Math.round(Math.abs(amount)); // Ensure positive
    
    if (amount <= 0) {
      throw new Error('Penalty amount must be positive');
    }
    
    if (!reason || reason.length < 10) {
      throw new Error('Reason must be at least 10 characters');
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Create penalty earning (negative amount)
      const earning = await StaffEarning.create([{
        staffId,
        amount: -amount, // NEGATIVE for penalty
        earningType: 'penalty',
        status: 'approved', // Penalty is auto-approved
        referenceDate: new Date(),
        description: 'Penalty',
        reason,
        createdBy,
        createdByType,
        approvedBy: createdBy,
        approvedAt: new Date()
      }], { session });
      
      // Update account (deduct from available)
      const account = await StaffAccount.getOrCreate(staffId);
      account.availableForPayout = Math.max(0, account.availableForPayout - amount);
      account.totalEarned -= amount;
      account.statistics.totalPenalties += 1;
      await account.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return earning[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * ADMIN: Manual adjustment (correction)
   */
  async applyAdjustment(staffId, amount, direction, reason, createdBy, createdByType) {
    amount = Math.round(Math.abs(amount));
    
    if (amount <= 0) {
      throw new Error('Adjustment amount must be positive');
    }
    
    if (!reason || reason.length < 10) {
      throw new Error('Reason must be at least 10 characters');
    }
    
    const actualAmount = direction === 'debit' ? -amount : amount;
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const earning = await StaffEarning.create([{
        staffId,
        amount: actualAmount,
        earningType: 'adjustment',
        status: 'approved',
        referenceDate: new Date(),
        description: `Manual ${direction} adjustment`,
        reason,
        createdBy,
        createdByType,
        approvedBy: createdBy,
        approvedAt: new Date()
      }], { session });
      
      // Update account
      const account = await StaffAccount.getOrCreate(staffId);
      
      if (direction === 'credit') {
        await account.addEarning(amount, 'approved');
      } else {
        account.availableForPayout = Math.max(0, account.availableForPayout - amount);
        account.totalEarned -= amount;
      }
      
      account.statistics.totalAdjustments += 1;
      await account.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      return earning[0];
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * GET: Staff earnings with filters
   */
  async getStaffEarnings(staffId, filters = {}) {
    const query = { staffId };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.earningType) {
      query.earningType = filters.earningType;
    }
    
    if (filters.branchId) {
      query.branchId = filters.branchId;
    }
    
    if (filters.startDate || filters.endDate) {
      query.referenceDate = {};
      if (filters.startDate) query.referenceDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.referenceDate.$lte = new Date(filters.endDate);
    }
    
    console.log('[teacherEarningService] Query:', query);
    
    const earnings = await StaffEarning.find(query)
      .populate('classId', 'date')
      .populate('studentId', 'name')
      .populate('approvedBy', 'name')
      .sort({ referenceDate: -1, createdAt: -1 });
    
    return earnings;
  }
  
  /**
   * GET: Staff account summary
   */
  async getStaffAccount(staffId, branchFilter = {}) {
    const account = await StaffAccount.getOrCreate(staffId);
    // Note: Account summary is per-staff, not filtered by branch in this simplified version
    // If branch-level account isolation needed, this would require schema changes
    console.log('[teacherEarningService] Getting account for staffId:', staffId, 'branchFilter:', branchFilter);
    return account;
  }
  
  /**
   * GET: Pending earnings for approval (admin view)
   */
  async getPendingEarnings(filters = {}) {
    const query = { status: 'pending' };
    
    if (filters.staffId) {
      query.staffId = filters.staffId;
    }
    
    if (filters.startDate || filters.endDate) {
      query.referenceDate = {};
      if (filters.startDate) query.referenceDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.referenceDate.$lte = new Date(filters.endDate);
    }
    
    const earnings = await StaffEarning.find(query)
      .populate('staffId', 'name email')
      .populate('classId', 'date')
      .sort({ referenceDate: -1 });
    
    return earnings;
  }
  
  /**
   * UTILITY: Recalculate staff account (for audit/reconciliation)
   */
  async recalculateStaffAccount(staffId) {
    return await StaffAccount.recalculateBalance(staffId);
  }
}

module.exports = new StaffEarningService();