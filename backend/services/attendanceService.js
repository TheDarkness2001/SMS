const Attendance = require('../models/Attendance');
const AttendanceAudit = require('../models/AttendanceAudit');
const Teacher = require('../models/Teacher');

/**
 * Attendance Service - Core logic for test and production modes
 */

// Log audit trail
exports.logAudit = async (data) => {
  try {
    await AttendanceAudit.create(data);
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

// Check if attendance record exists for today
exports.getAttendanceToday = async (teacherId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await Attendance.findOne({
    teacher: teacherId,
    date: {
      $gte: today,
      $lt: tomorrow
    }
  });
};

// Create new attendance record
exports.createAttendance = async (teacherId, mode = 'test', consentData = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already exists
  const existing = await exports.getAttendanceToday(teacherId);
  if (existing) {
    return { success: false, message: 'Attendance already recorded for today', data: existing };
  }

  const attendanceRecord = await Attendance.create({
    teacher: teacherId,
    date: today,
    status: 'absent', // Default to absent, updated on check-in
    mode: mode,
    verificationStatus: mode === 'test' ? 'pending' : 'pending',
    consent: {
      cameraAccess: consentData.cameraAccess || false,
      locationAccess: consentData.locationAccess || false,
      dataStorage: consentData.dataStorage || false,
      consentDate: new Date()
    }
  });

  // Log audit
  await exports.logAudit({
    attendance: attendanceRecord._id,
    teacher: teacherId,
    action: 'created',
    actionBy: teacherId,
    role: 'teacher',
    description: `Attendance record created in ${mode} mode`
  });

  return { success: true, data: attendanceRecord };
};

// Record check-in
exports.recordCheckIn = async (attendanceId, checkInData) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return { success: false, message: 'Attendance record not found' };
  }

  if (attendance.checkInTime) {
    return { success: false, message: 'Already checked in' };
  }

  const updateData = {
    checkInTime: new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }),
    status: 'present',
    checkInPhoto: checkInData.photo || '',
    checkInLocation: checkInData.location || { latitude: 0, longitude: 0, accuracy: 0 },
    'deviceInfo.userAgent': checkInData.userAgent || '',
    'deviceInfo.platform': checkInData.platform || '',
    'deviceInfo.deviceType': checkInData.deviceType || 'unknown',
    'deviceInfo.ipAddress': checkInData.ipAddress || ''
  };

  const updated = await Attendance.findByIdAndUpdate(
    attendanceId,
    updateData,
    { new: true }
  );

  // Log audit
  await exports.logAudit({
    attendance: attendanceId,
    teacher: attendance.teacher,
    action: 'checked-in',
    actionBy: attendance.teacher,
    role: 'teacher',
    description: `Check-in recorded at ${updateData.checkInTime}`
  });

  return { success: true, data: updated };
};

// Record check-out
exports.recordCheckOut = async (attendanceId, checkOutData) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return { success: false, message: 'Attendance record not found' };
  }

  if (!attendance.checkInTime) {
    return { success: false, message: 'Must check in first' };
  }

  if (attendance.checkOutTime) {
    return { success: false, message: 'Already checked out' };
  }

  const checkOutTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });

  const updateData = {
    checkOutTime: checkOutTime,
    checkOutPhoto: checkOutData.photo || '',
    checkOutLocation: checkOutData.location || { latitude: 0, longitude: 0, accuracy: 0 }
  };

  const updated = await Attendance.findByIdAndUpdate(
    attendanceId,
    updateData,
    { new: true }
  );

  // Log audit
  await exports.logAudit({
    attendance: attendanceId,
    teacher: attendance.teacher,
    action: 'checked-out',
    actionBy: attendance.teacher,
    role: 'teacher',
    description: `Check-out recorded at ${checkOutTime}`
  });

  return { success: true, data: updated };
};

// Verify attendance (Test Mode)
exports.verifyAttendanceTest = async (attendanceId, verificationData) => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return { success: false, message: 'Attendance record not found' };
  }

  // In test mode, marks as verified based on photo + location input
  const updateData = {
    verificationStatus: 'verified',
    'verification.faceMatch': verificationData.faceMatch || false,
    'verification.locationMatch': verificationData.locationMatch || false,
    'verification.deviceMatch': true // Always true in test
  };

  const updated = await Attendance.findByIdAndUpdate(
    attendanceId,
    updateData,
    { new: true }
  );

  // Log audit
  await exports.logAudit({
    attendance: attendanceId,
    teacher: attendance.teacher,
    action: 'verified',
    actionBy: attendance.teacher,
    role: 'teacher',
    description: 'Attendance verified in TEST mode'
  });

  return { success: true, data: updated };
};

// Admin approve/reject
exports.adminReview = async (attendanceId, adminId, action, notes = '') => {
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) {
    return { success: false, message: 'Attendance record not found' };
  }

  const updateData = {
    approvedBy: adminId,
    adminNotes: notes
  };

  if (action === 'approve') {
    updateData.verificationStatus = 'verified';
  } else if (action === 'reject') {
    updateData.verificationStatus = 'rejected';
    updateData.rejectionReason = notes;
  } else if (action === 'review') {
    updateData.verificationStatus = 'needs-review';
  }

  const updated = await Attendance.findByIdAndUpdate(
    attendanceId,
    updateData,
    { new: true }
  );

  // Log audit
  await exports.logAudit({
    attendance: attendanceId,
    teacher: attendance.teacher,
    action: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'notes-added',
    actionBy: adminId,
    role: 'admin',
    description: `Admin ${action}: ${notes || 'No notes'}`
  });

  return { success: true, data: updated };
};

// Get statistics
exports.getStatistics = async (filters = {}) => {
  const matchStage = { $match: {} };

  if (filters.startDate || filters.endDate) {
    matchStage.$match.date = {};
    if (filters.startDate) matchStage.$match.date.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.$match.date.$lte = new Date(filters.endDate);
  }

  if (filters.mode) matchStage.$match.mode = filters.mode;
  if (filters.teacher) matchStage.$match.teacher = filters.teacher;

  const stats = await Attendance.aggregate([
    matchStage,
    {
      $group: {
        _id: null,
        totalRecords: { $sum: 1 },
        verified: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'verified'] }, 1, 0] }
        },
        needsReview: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'needs-review'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$verificationStatus', 'rejected'] }, 1, 0] }
        },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        absent: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalRecords: 0,
    verified: 0,
    needsReview: 0,
    rejected: 0,
    present: 0,
    late: 0,
    absent: 0
  };
};

// Get audit trail
exports.getAuditTrail = async (attendanceId, limit = 20) => {
  return await AttendanceAudit.find({ attendance: attendanceId })
    .populate('actionBy', 'name email')
    .sort('-createdAt')
    .limit(limit);
};
