const SalaryPayout = require('../models/SalaryPayout');

/**
 * Simplified Salary Payout Controller
 * Record direct payments to staff without wallet/earnings tracking
 * Admin/Manager/Founder only
 */

// @desc    Create salary payout record
// @route   POST /api/salary-payouts
// @access  Private (Admin/Manager/Founder)
exports.createPayout = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();
    
    if (!['admin', 'founder', 'manager'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, founder, or manager can create payouts'
      });
    }

    const { staffId, amount, method, paymentDate, bankDetails, notes } = req.body;

    // Validation
    if (!staffId) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (!method) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Create payout record
    const payout = await SalaryPayout.create({
      staffId,
      earningIds: [], // No earnings tracking in simplified version
      amount: Math.round(amount), // Should be in tyiyn
      method,
      bankDetails: method === 'bank-transfer' ? bankDetails : undefined,
      notes,
      approvedBy: req.user._id,
      approvedByType: userRole,
      referenceNumber: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      metadata: {
        paymentDate: paymentDate || new Date()
      },
      status: 'completed', // Directly mark as completed in simplified version
      completedAt: new Date(),
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payout
    });
  } catch (error) {
    console.error('Error creating payout:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all salary payouts
// @route   GET /api/salary-payouts
// @access  Private (Admin/Manager/Founder: all, Teacher: own)
exports.getPayouts = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();
    const userId = req.user._id;

    let query = {};

    // Branch filtering: Non-founders see only their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      // Founders can filter by branch
      query.branchId = req.query.branchId;
    }

    // Teachers can only view their own payouts
    if (userRole === 'teacher') {
      query.staffId = userId;
    } else if (['admin', 'founder', 'manager'].includes(userRole)) {
      // Admin/Manager/Founder can filter by teacher
      if (req.query.staffId) {
        query.staffId = req.query.staffId;
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Apply filters
    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.method) {
      query.method = req.query.method;
    }

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    console.log('[SalaryPayout] Query with branch filter:', query);

    const payouts = await SalaryPayout.find(query)
      .populate('staffId', 'name email teacherId')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payouts.length,
      data: payouts
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single payout by ID
// @route   GET /api/salary-payouts/:id
// @access  Private
exports.getPayoutById = async (req, res) => {
  try {
    const payout = await SalaryPayout.findById(req.params.id)
      .populate('staffId', 'name email teacherId')
      .populate('approvedBy', 'name email');

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payout
    });
  } catch (error) {
    console.error('Error fetching payout:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark payout as completed
// @route   PATCH /api/salary-payouts/:id/complete
// @access  Private (Admin/Founder only)
exports.completePayout = async (req, res) => {
  try {
    const userRole = (req.user.role || req.userType || '').toLowerCase().trim();

    if (!['admin', 'founder'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or founder can complete payouts'
      });
    }

    const payout = await SalaryPayout.findById(req.params.id);

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    await payout.complete();

    res.status(200).json({
      success: true,
      message: 'Payout marked as completed',
      data: payout
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel payout
// @route   PATCH /api/salary-payouts/:id/cancel
// @access  Private (Admin/Founder only)
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

    const payout = await SalaryPayout.findById(req.params.id);

    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    await payout.cancel(reason);

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
