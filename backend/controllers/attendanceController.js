const Attendance = require('../models/Attendance');

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = async (req, res) => {
  try {
    const { teacher, date, status, startDate, endDate, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    if (teacher) query.teacher = teacher;
    if (status) query.status = status;
    if (date) {
      const searchDate = new Date(date);
      query.date = {
        $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
        $lt: new Date(searchDate.setHours(23, 59, 59, 999))
      };
    }
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('teacher', 'name email subject department')
      .populate('approvedBy', 'name')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
exports.getSingleAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('teacher', 'name email subject')
      .populate('approvedBy', 'name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
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

// @desc    Create attendance record
// @route   POST /api/attendance
// @access  Private
exports.createAttendance = async (req, res) => {
  try {
    // Check if attendance record already exists for this teacher today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingRecord = await Attendance.findOne({
      teacher: req.body.teacher,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: 'Attendance record already exists for today'
      });
    }

    const attendanceData = {
      ...req.body,
      approvedBy: req.user._id,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    };

    // Handle file uploads
    if (req.files && req.files.checkInPhoto) {
      attendanceData.checkInPhoto = req.files.checkInPhoto[0].filename;
    } else if (req.file) {
      attendanceData.checkInPhoto = req.file.filename;
    }

    // Add IP address from request
    if (req.connection) {
      attendanceData['deviceInfo.ipAddress'] = req.connection.remoteAddress;
    }

    // Auto-set check-in time if not provided (for manual attendance marking)
    if (!attendanceData.checkInTime) {
      attendanceData.checkInTime = new Date();
    }

    const attendance = await Attendance.create(attendanceData);

    res.status(201).json({
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

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private
exports.updateAttendance = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Handle file uploads for check-out
    if (req.files && req.files.checkOutPhoto) {
      updateData.checkOutPhoto = req.files.checkOutPhoto[0].filename;
    } else if (req.file) {
      updateData.checkOutPhoto = req.file.filename;
    }

    // Add IP address from request
    if (req.connection) {
      updateData['deviceInfo.ipAddress'] = req.connection.remoteAddress;
    }

    // Validate required fields for check-out
    if (updateData.checkOutTime && !updateData.checkOutPhoto) {
      return res.status(400).json({
        success: false,
        message: 'Check-out photo is required'
      });
    }

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('teacher', 'name email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
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

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Admin
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
