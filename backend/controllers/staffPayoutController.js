const staffPayoutService = require('../services/staffPayoutService');

/**
 * Staff Payout Controller
 * ADMIN-ONLY access for staff payouts
 * 
 * Access Levels:
 * - Teachers: Cannot create or manage payouts (read-only own history)
 * - Manager: Can view payouts, create payouts
 * - Admin/Founder: Full access (create, complete, cancel)
 */

// @desc    Get staff payouts (own or all based on role)
// @route   GET /api/staff-payouts
// @access  Private (Teacher: own, Admin/Manager: all)
exports.getPayouts = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();
    const userId = req.user._id;
    
    // Teachers can only view their own payouts
    let staffId = userId;
    
    // Admin/Manager can view any staff's payouts
    if (['admin', 'founder', 'manager'].includes(userRole)) {
      staffId = req.query.staffId || null;
    }
    
    const filters = {
      status: req.query.status,
      method: req.query.method,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    let payouts;
    
    if (staffId) {
      payouts = await staffPayoutService.getStaffPayouts(staffId, filters);
    } else {
      payouts = await staffPayoutService.getAllPayouts(filters);
    }
    
    res.status(200).json({
      success: true,
      data: payouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payout by ID
// @route   GET /api/staff-payouts/:id
// @access  Private (Teacher: own, Admin/Manager: any)
exports.getPayoutById = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    const userId = req.user._id;
    
    const payout = await staffPayoutService.getPayoutById(req.params.id);
    
    // Teachers can only view their own payouts
    if (userRole === 'teacher' && payout.staffId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own payouts'
      });
    }
    
    res.status(200).json({
      success: true,
      data: payout
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pending payouts (Admin/Manager only)
// @route   GET /api/staff-payouts/pending/list
// @access  Private (Admin/Manager)
exports.getPendingPayouts = async (req, res) => {
  try {
    const userRole = req.user.role || req.userType;
    
    if (!['admin', 'founder', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, founder, or manager can view pending payouts'
      });
    }
    
    const payouts = await staffPayoutService.getPendingPayouts();
    
    res.status(200).json({
      success: true,
      data: payouts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Calculate payout preview (Admin/Manager only)
// @route   POST /api/staff-payouts/preview
// @access  Private (Admin/Manager)
exports.calculatePayoutPreview = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();
    
    if (!['admin', 'founder', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, founder, or manager can preview payouts'
      });
    }
    
    const { staffId, earningIds } = req.body;
    
    if (!staffId || !earningIds || !Array.isArray(earningIds) || earningIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID and earning IDs are required'
      });
    }
    
    const preview = await staffPayoutService.calculatePayoutPreview(staffId, earningIds);
    
    res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create payout (Admin/Manager only)
// @route   POST /api/staff-payouts
// @access  Private (Admin/Manager)
exports.createPayout = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();
    const userId = req.user._id;
    
    if (!['admin', 'founder', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, founder, or manager can create payouts'
      });
    }
    
    const { staffId, earningIds, method, bankDetails, notes } = req.body;
    
    // Validation
    if (!staffId || !earningIds || !method) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, earning IDs, and payment method are required'
      });
    }
    
    if (!Array.isArray(earningIds) || earningIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Must select at least one earning for payout'
      });
    }
    
    const validMethods = ['cash', 'bank-transfer', 'uzcard', 'humo', 'card', 'check'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }
    
    // Bank details required for bank transfers
    if (method === 'bank-transfer' && !bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Bank details are required for bank transfers'
      });
    }
    
    const payout = await staffPayoutService.createPayout(
      staffId,
      earningIds,
      method,
      userId,
      userRole,
      bankDetails,
      notes
    );
    
    res.status(201).json({
      success: true,
      message: 'Payout created successfully',
      data: payout
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Complete payout (Admin/Founder only)
// @route   PATCH /api/staff-payouts/:id/complete
// @access  Private (Admin/Founder)
exports.completePayout = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();
    
    if (!['admin', 'founder'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can complete payouts'
      });
    }
    
    const payout = await staffPayoutService.completePayout(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Payout completed successfully',
      data: payout
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel payout (Admin/Founder only)
// @route   PATCH /api/staff-payouts/:id/cancel
// @access  Private (Admin/Founder)
exports.cancelPayout = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();
    
    if (!['admin', 'founder'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can cancel payouts'
      });
    }
    
    const { reason } = req.body;
    
    if (!reason || reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required (minimum 10 characters)'
      });
    }
    
    const payout = await staffPayoutService.cancelPayout(req.params.id, reason);
    
    res.status(200).json({
      success: true,
      message: 'Payout cancelled successfully',
      data: payout
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
