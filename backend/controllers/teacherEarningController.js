const teacherEarningService = require('../services/teacherEarningService');
const { validationResult } = require('express-validator');

// Create earning for completed class
const createEarningForClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { classId, teacherId, subject, amount, classDate } = req.body;

    const earning = await teacherEarningService.createEarningForClass(
      classId,
      teacherId,
      subject,
      parseFloat(amount),
      new Date(classDate)
    );

    res.status(201).json({
      success: true,
      data: earning
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get teacher earnings
const getTeacherEarnings = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status, startDate, endDate } = req.query;

    // Only allow teacher to access their own earnings or admin to access any
    if (req.user.role !== 'admin' && req.user._id.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access these earnings'
      });
    }

    const earnings = await teacherEarningService.getTeacherEarnings(
      teacherId,
      status,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.status(200).json({
      success: true,
      data: earnings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get teacher earnings summary
const getTeacherEarningsSummary = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { period = 'monthly' } = req.query;

    // Only allow teacher to access their own earnings or admin to access any
    if (req.user.role !== 'admin' && req.user._id.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access these earnings'
      });
    }

    const summary = await teacherEarningService.getTeacherEarningsSummary(teacherId, period);

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

// Mark earnings as paid
const markEarningsAsPaid = async (req, res) => {
  try {
    // Only allow admin to mark earnings as paid
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can mark earnings as paid'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { earningIds, teacherId, paymentMethod, referenceNumber, notes } = req.body;
    const paidBy = req.user._id;

    const result = await teacherEarningService.markEarningsAsPaid(
      earningIds,
      teacherId,
      paymentMethod,
      paidBy,
      referenceNumber,
      notes
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Apply teacher penalty
const applyTeacherPenalty = async (req, res) => {
  try {
    // Only allow admin to apply teacher penalties
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can apply teacher penalties'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { teacherId, amount, reason } = req.body;
    const appliedBy = req.user._id;

    const penaltyEarning = await teacherEarningService.applyTeacherPenalty(
      teacherId,
      parseFloat(amount),
      reason,
      appliedBy
    );

    res.status(201).json({
      success: true,
      data: penaltyEarning
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Lock earnings after period
const lockEarningsAfterPeriod = async (req, res) => {
  try {
    // Only allow admin to lock earnings
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can lock earnings'
      });
    }

    const { teacherId, daysToLock = 30 } = req.body;

    const result = await teacherEarningService.lockEarningsAfterPeriod(teacherId, parseInt(daysToLock));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Get salary payout history
const getSalaryPayoutHistory = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;

    // Only allow teacher to access their own payouts or admin to access any
    if (req.user.role !== 'admin' && req.user._id.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access this payout history'
      });
    }

    const payouts = await teacherEarningService.getSalaryPayoutHistory(
      teacherId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.status(200).json({
      success: true,
      data: payouts
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createEarningForClass,
  getTeacherEarnings,
  getTeacherEarningsSummary,
  markEarningsAsPaid,
  applyTeacherPenalty,
  lockEarningsAfterPeriod,
  getSalaryPayoutHistory
};