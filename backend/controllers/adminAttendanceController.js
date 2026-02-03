const Attendance = require('../models/Attendance');
const attendanceService = require('../services/attendanceService');

/**
 * @desc    Get all attendance records (Admin view)
 * @route   GET /api/admin-attendance
 * @access  Private/Admin
 */
exports.getAllAttendance = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      teacher,
      status,
      verificationStatus,
      mode,
      startDate,
      endDate,
      sort = '-date'
    } = req.query;

    const query = {};

    // Apply filters
    if (teacher) query.teacher = teacher;
    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (mode) query.mode = mode;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const records = await Attendance.find(query)
      .populate('teacher', 'teacherId name email subject')
      .populate('approvedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);

    res.status(200).json({
      success: true,
      count: records.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get single attendance record details
 * @route   GET /api/admin-attendance/:id
 * @access  Private/Admin
 */
exports.getAttendanceDetails = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id)
      .populate('teacher', 'teacherId name email subject department')
      .populate('approvedBy', 'name email');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Get audit trail
    const auditTrail = await attendanceService.getAuditTrail(req.params.id, 20);

    res.status(200).json({
      success: true,
      data: {
        ...record.toObject(),
        auditTrail
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Approve attendance record
 * @route   PUT /api/admin-attendance/:id/approve
 * @access  Private/Admin
 */
exports.approveAttendance = async (req, res) => {
  try {
    const { notes = '' } = req.body;
    const adminId = req.user._id;
    const attendanceId = req.params.id;

    const result = await attendanceService.adminReview(
      attendanceId,
      adminId,
      'approve',
      notes
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record approved',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Reject attendance record
 * @route   PUT /api/admin-attendance/:id/reject
 * @access  Private/Admin
 */
exports.rejectAttendance = async (req, res) => {
  try {
    const { notes = 'Rejected by admin' } = req.body;
    const adminId = req.user._id;
    const attendanceId = req.params.id;

    if (!notes) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const result = await attendanceService.adminReview(
      attendanceId,
      adminId,
      'reject',
      notes
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record rejected',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Mark for review
 * @route   PUT /api/admin-attendance/:id/review
 * @access  Private/Admin
 */
exports.markForReview = async (req, res) => {
  try {
    const { notes = '' } = req.body;
    const adminId = req.user._id;
    const attendanceId = req.params.id;

    const result = await attendanceService.adminReview(
      attendanceId,
      adminId,
      'review',
      notes
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance marked for review',
      data: result.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Add admin notes to attendance
 * @route   PUT /api/admin-attendance/:id/notes
 * @access  Private/Admin
 */
exports.addAdminNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({
        success: false,
        message: 'Notes are required'
      });
    }

    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { adminNotes: notes },
      { new: true }
    );

    // Log audit
    await attendanceService.logAudit({
      attendance: req.params.id,
      teacher: record.teacher,
      action: 'notes-added',
      actionBy: req.user._id,
      role: req.user.role,
      description: `Admin added notes: ${notes}`
    });

    res.status(200).json({
      success: true,
      message: 'Notes added successfully',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get attendance statistics (Admin view)
 * @route   GET /api/admin-attendance/stats/overview
 * @access  Private/Admin
 */
exports.getAdminStats = async (req, res) => {
  try {
    const { startDate, endDate, teacher, mode } = req.query;

    const stats = await attendanceService.getStatistics({
      startDate,
      endDate,
      teacher,
      mode
    });

    // Get records by verification status
    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (mode) query.mode = mode;

    const verificationBreakdown = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const modeBreakdown = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$mode',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats,
        verificationBreakdown: verificationBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        modeBreakdown: modeBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get audit trail for attendance (Admin view)
 * @route   GET /api/admin-attendance/:id/audit-trail
 * @access  Private/Admin
 */
exports.getFullAuditTrail = async (req, res) => {
  try {
    const auditTrail = await attendanceService.getAuditTrail(req.params.id, 100);

    res.status(200).json({
      success: true,
      count: auditTrail.length,
      data: auditTrail
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
