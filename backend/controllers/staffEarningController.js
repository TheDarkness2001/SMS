const staffEarningService = require('../services/teacherEarningService');
const StaffEarning = require('../models/TeacherEarning');
const StaffAccount = require('../models/StaffAccount');

/**
 * Staff Earning Controller
 * Role-based access control for staff earnings
 * 
 * Access Levels:
 * - Teachers: View own earnings only (read-only)
 * - Manager: View all earnings, approve earnings
 * - Admin/Founder: Full access (approve, bonus, penalty, adjustment)
 */

// @desc    Get staff earnings (own or all based on role)
// @route   GET /api/staff-earnings
// @access  Private (Teacher: own, Admin/Manager: all)
exports.getEarnings = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    const userId = req.user._id;
    
    // Teachers can only view their own earnings
    let staffId = userId;
    
    // Admin/Manager can view any staff's earnings
    if (['admin', 'founder', 'manager'].includes(userRole)) {
      staffId = req.query.staffId || userId;
    }
    
    const filters = {
      status: req.query.status,
      earningType: req.query.earningType,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      branchId: req.query.branchId // Add branch filter
    };
    
    // Branch filtering: Non-founders see only their branch
    if (req.user.role !== 'founder') {
      filters.branchId = req.user.branchId;
    }
    
    console.log('[StaffEarning] Fetching earnings with filters:', filters);
    
    const earnings = await staffEarningService.getStaffEarnings(staffId, filters);
    
    res.status(200).json({
      success: true,
      data: earnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get staff account summary
// @route   GET /api/staff-earnings/account
// @access  Private (Teacher: own, Admin/Manager: any)
exports.getAccount = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    const userId = req.user._id;
    
    let staffId = userId;
    
    if (['admin', 'founder', 'manager'].includes(userRole)) {
      staffId = req.query.staffId || userId;
    }
    
    // Branch filtering
    const branchFilter = {};
    if (req.user.role !== 'founder') {
      branchFilter.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      branchFilter.branchId = req.query.branchId;
    }
    
    console.log('[StaffEarning] Fetching account with branch filter:', branchFilter);
    
    const account = await staffEarningService.getStaffAccount(staffId, branchFilter);
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pending earnings for approval (Admin/Manager only)
// @route   GET /api/staff-earnings/pending
// @access  Private (Admin/Manager)
exports.getPendingEarnings = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    
    if (!['admin', 'founder', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, founder, or manager can view pending earnings'
      });
    }
    
    const filters = {
      staffId: req.query.staffId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      branchId: req.query.branchId
    };
    
    // Branch filtering: Non-founders see only their branch
    if (req.user.role !== 'founder') {
      filters.branchId = req.user.branchId;
    }
    
    const earnings = await staffEarningService.getPendingEarnings(filters);
    
    res.status(200).json({
      success: true,
      data: earnings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Approve earning (Admin/Manager only)
// @route   PATCH /api/staff-earnings/:id/approve
// @access  Private (Admin/Manager)
exports.approveEarning = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    const userId = req.user._id;
    
    if (!['admin', 'founder', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, founder, or manager can approve earnings'
      });
    }
    
    const earning = await staffEarningService.approveEarning(
      req.params.id,
      userId,
      userRole
    );
    
    res.status(200).json({
      success: true,
      message: 'Earning approved successfully',
      data: earning
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Apply bonus (Admin/Founder only)
// @route   POST /api/staff-earnings/bonus
// @access  Private (Admin/Founder)
exports.applyBonus = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    const userId = req.user._id;
    
    if (!['admin', 'founder'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can apply bonuses'
      });
    }
    
    const { staffId, amount, reason } = req.body;
    
    if (!staffId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, amount, and reason are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Bonus amount must be positive'
      });
    }
    
    if (reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be at least 10 characters'
      });
    }
    
    const earning = await staffEarningService.applyBonus(
      staffId,
      amount * 100, // Convert so'm to tyiyin
      reason,
      userId,
      userRole
    );
    
    res.status(201).json({
      success: true,
      message: 'Bonus applied successfully',
      data: earning
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Apply penalty (Admin/Founder only)
// @route   POST /api/staff-earnings/penalty
// @access  Private (Admin/Founder)
exports.applyPenalty = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    const userId = req.user._id;
    
    if (!['admin', 'founder'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can apply penalties'
      });
    }
    
    const { staffId, amount, reason } = req.body;
    
    if (!staffId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, amount, and reason are required'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Penalty amount must be positive'
      });
    }
    
    if (reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be at least 10 characters'
      });
    }
    
    const earning = await staffEarningService.applyPenalty(
      staffId,
      amount * 100, // Convert so'm to tyiyin
      reason,
      userId,
      userRole
    );
    
    res.status(201).json({
      success: true,
      message: 'Penalty applied successfully',
      data: earning
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Apply adjustment (Admin/Founder only)
// @route   POST /api/staff-earnings/adjustment
// @access  Private (Admin/Founder)
exports.applyAdjustment = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    const userId = req.user._id;
    
    if (!['admin', 'founder'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can make adjustments'
      });
    }
    
    const { staffId, amount, direction, reason } = req.body;
    
    if (!staffId || !amount || !direction || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, amount, direction, and reason are required'
      });
    }
    
    if (!['credit', 'debit'].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: 'Direction must be either "credit" or "debit"'
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Adjustment amount must be positive'
      });
    }
    
    if (reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be at least 10 characters'
      });
    }
    
    const earning = await staffEarningService.applyAdjustment(
      staffId,
      amount * 100, // Convert so'm to tyiyin
      direction,
      reason,
      userId,
      userRole
    );
    
    res.status(201).json({
      success: true,
      message: 'Adjustment applied successfully',
      data: earning
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Recalculate staff account (Admin only - for audit)
// @route   POST /api/staff-earnings/:staffId/recalculate
// @access  Private (Admin/Founder)
exports.recalculateAccount = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    
    if (!['admin', 'founder'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can recalculate accounts'
      });
    }
    
    const account = await staffEarningService.recalculateStaffAccount(req.params.staffId);
    
    res.status(200).json({
      success: true,
      message: 'Account recalculated successfully',
      data: account
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
