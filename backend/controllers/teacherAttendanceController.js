const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const attendanceService = require('../services/attendanceService');

/**
 * @desc    Mark teacher attendance (present/absent/late)
 * @route   POST /api/teacher-attendance/mark
 * @access  Private/Admin/Manager/Founder
 */
exports.markAttendance = async (req, res) => {
  try {
    const { teacherId, status, date, notes } = req.body;

    // Validate required fields
    if (!teacherId || !status) {
      return res.status(400).json({
        success: false,
        message: 'teacherId and status are required'
      });
    }

    if (!['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be present, absent, or late'
      });
    }

    // Check if teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Create/update attendance record
    const attendanceDate = date ? new Date(date) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { teacher: teacherId, date: attendanceDate },
      {
        teacher: teacherId,
        date: attendanceDate,
        status,
        notes,
        markedBy: req.user._id,
        markedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: `Teacher marked as ${status}`,
      data: attendance
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get today's attendance record
 * @route   GET /api/teacher-attendance/today
 * @access  Private/Teacher
 */
exports.getTodayAttendance = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const attendance = await attendanceService.getAttendanceToday(teacherId);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record for today'
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Check-in removed - using simple status marking instead

// Check-out removed - using simple status marking instead

/**
 * @desc    Get attendance history for teacher
 * @route   GET /api/teacher-attendance/history
 * @access  Private/Teacher
 */
exports.getAttendanceHistory = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { startDate, endDate, limit = 30 } = req.query;

    const query = { teacher: teacherId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const history = await Attendance.find(query)
      .sort('-date')
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get audit trail for an attendance record
 * @route   GET /api/teacher-attendance/:id/audit
 * @access  Private/Teacher/Admin
 */
exports.getAuditTrail = async (req, res) => {
  try {
    const attendanceId = req.params.id;

    const auditTrail = await attendanceService.getAuditTrail(attendanceId, 50);

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

/**
 * @desc    Get teacher's attendance statistics
 * @route   GET /api/teacher-attendance/stats/my-stats
 * @access  Private/Teacher
 */
exports.getMyStats = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const { startDate, endDate } = req.query;

    const stats = await attendanceService.getStatistics({
      teacher: teacherId,
      startDate,
      endDate
    });

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
