const StudentAttendance = require('../models/StudentAttendance');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const ClassSchedule = require('../models/ClassSchedule');
const attendancePaymentProcessor = require('../utils/attendancePaymentProcessor');
const { emitNotificationEvent } = require('../utils/notificationEvents');

// Helper function to create or find class record for attendance
const createClassRecordForAttendance = async (attendanceRecord, recordedBy) => {
  // Find or create a class record for the date and subject
  let classRecord = await Class.findOne({
    date: new Date(attendanceRecord.date).setHours(0, 0, 0, 0),
    subjectId: attendanceRecord.subjectId || attendanceRecord.subject,
    roomNumber: attendanceRecord.roomNumber || 'default'
  });

  if (!classRecord) {
    // Find the class schedule to get teacher info
    const classSchedule = await ClassSchedule.findOne({
      subject: attendanceRecord.subjectId || attendanceRecord.subject
    });

    if (classSchedule) {
      // Create a new class record
      classRecord = await Class.create({
        classScheduleId: classSchedule._id,
        date: new Date(attendanceRecord.date),
        startTime: classSchedule.startTime || '00:00',
        endTime: classSchedule.endTime || '00:00',
        teacherId: classSchedule.teacher,
        subjectId: classSchedule.subject, // This might need adjustment based on how subjects are stored
        roomNumber: classSchedule.roomNumber || 'default',
        recordedBy: recordedBy
      });
    } else {
      // If no schedule exists, create a basic class record
      classRecord = await Class.create({
        date: new Date(attendanceRecord.date),
        startTime: '00:00',
        endTime: '00:00',
        teacherId: attendanceRecord.teacher,
        subjectId: attendanceRecord.subjectId || attendanceRecord.subject,
        roomNumber: 'default',
        recordedBy: recordedBy
      });
    }
  }

  return classRecord;
};

// Helper function to check if attendance can be marked
const canMarkAttendance = async (userId, userRole, studentId, subject) => {
  // Admin, Manager, and Founder can always mark attendance
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'founder') {
    return { allowed: true, reason: '' };
  }

  // For teachers, allow marking attendance anytime
  return { allowed: true, reason: '' };
};

// @desc    Get all student attendance records
// @route   GET /api/student-attendance
// @access  Private
exports.getAttendance = async (req, res) => {
  try {
    const { student, class: studentClass, date, status, startDate, endDate, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    // Restrict teachers to only see their own students
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      // Get students assigned to this teacher
      const teacherStudents = await Student.find({ subjects: req.user.subject });
      query.student = { $in: teacherStudents.map(s => s._id) };
    }

    if (student) query.student = student;
    if (studentClass) query.class = studentClass;
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

    const attendance = await StudentAttendance.find(query)
      .populate('student', 'name studentId class')
      .populate('teacher', 'name email subject')
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

// @desc    Get attendance records for a specific student
// @route   GET /api/student-attendance/student/:studentId
// @access  Private (Students can only see their own)
exports.getByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Students can only view their own attendance
    if (req.userType === 'student' && req.user._id.toString() !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this student\'s attendance'
      });
    }

    const query = { student: studentId };
    
    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder' && req.user.role) {
      query.branchId = req.user.branchId;
    }

    const attendance = await StudentAttendance.find(query)
      .populate('teacher', 'name subject')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  } catch (error) {
    console.error('Error in getByStudent:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single student attendance record
// @route   GET /api/student-attendance/:id
// @access  Private
exports.getSingleAttendance = async (req, res) => {
  try {
    const attendance = await StudentAttendance.findById(req.params.id)
      .populate('student', 'name studentId class')
      .populate('teacher', 'name email subject')
      .populate('approvedBy', 'name');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Restrict teachers to only see their own students
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      const student = await Student.findById(attendance.student);
      if (!student.subjects.includes(req.user.subject)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this attendance record'
        });
      }
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

// @desc    Create student attendance record
// @route   POST /api/student-attendance
// @access  Private
exports.createAttendance = async (req, res) => {
  try {
    // Check if attendance record already exists for this student for this class on the specified date
    const targetDate = new Date(req.body.date || new Date());
    targetDate.setHours(0, 0, 0, 0);
    
    const existingRecord = await StudentAttendance.findOne({
      student: req.body.student,
      class: req.body.class,
      date: {
        $gte: targetDate,
        $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });
    
    if (existingRecord) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already marked for this student on this date',
        code: 'DUPLICATE_ATTENDANCE',
        existingRecord: {
          status: existingRecord.status,
          date: existingRecord.date
        }
      });
    }

    // Check time window permission for teachers
    const timeWindowCheck = await canMarkAttendance(
      req.user._id,
      req.user.role,
      req.body.student,
      req.body.class,
      req.body.subject
    );

    if (!timeWindowCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: timeWindowCheck.reason,
        code: 'TIME_WINDOW_EXPIRED'
      });
    }

    // Restrict teachers to only create attendance for their own students
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      const student = await Student.findById(req.body.student);
      if (!student.subjects.includes(req.user.subject)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create attendance for this student'
        });
      }
    }

    const attendanceData = {
      ...req.body,
      teacher: req.user._id, // Automatically set the teacher
      approvedBy: req.user._id,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    };

    // Convert subject name to ObjectId if it's a string
    if (attendanceData.subject && typeof attendanceData.subject === 'string' && attendanceData.subject.length < 24) {
      // It's likely a subject name, not an ObjectId - look it up
      const Subject = require('../models/Subject');
      
      // Try case-insensitive search
      const subjectDoc = await Subject.findOne({ 
        name: { $regex: new RegExp(`^${attendanceData.subject.trim()}$`, 'i') }
      });
      
      if (subjectDoc) {
        attendanceData.subject = subjectDoc._id;
      } else {
        // List available subjects for debugging
        const allSubjects = await Subject.find({}, 'name');
        const subjectNames = allSubjects.map(s => s.name).join(', ');
        
        return res.status(400).json({
          success: false,
          message: `Subject "${attendanceData.subject}" not found. Available subjects: ${subjectNames}`,
          code: 'INVALID_SUBJECT',
          availableSubjects: allSubjects
        });
      }
    }

    // Ensure teacher field is set (override if from req.body)
    attendanceData.teacher = req.user._id;

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

    const attendance = await StudentAttendance.create(attendanceData);

    // Process payment actions based on attendance status
    try {
      // Create or find a class record for this date and subject
      const classRecord = await createClassRecordForAttendance(attendance, req.user._id);
      
      const attendanceRecords = [{
        studentId: req.body.student,
        isPresent: req.body.status === 'present',
        isTeacherAbsent: req.body.isTeacherAbsent || false,
        isCanceled: req.body.isCanceled || false,
        recordedBy: req.user._id
      }];
      
      await attendancePaymentProcessor.processAttendanceForPayment(
        classRecord._id, // Using class record ID
        attendanceRecords
      );
    } catch (paymentError) {
      // Log payment processing errors but don't fail the attendance creation
      console.error('Payment processing error:', paymentError);
    }
    
    // Emit parent notification event for late/absent statuses
    try {
      const studentDoc = await Student.findById(attendance.student);
    
      if (studentDoc && (attendance.status === 'late' || attendance.status === 'absent')) {
        const eventType = attendance.status === 'late' ? 'ATTENDANCE_LATE' : 'ATTENDANCE_ABSENT';
    
        emitNotificationEvent(eventType, {
          studentId: studentDoc._id,
          eventType,
          createdAt: new Date(),
          payload: {
            studentFullName: studentDoc.name,
            subjectId: attendance.subject ? attendance.subject.toString() : undefined,
            subjectName: req.body.subjectName || '',
            date: attendance.date,
            attendanceTime: attendance.checkInTime,
            lessonId: attendance.class
          }
        });
      }
    } catch (notifyError) {
      // Fail silently – do not block attendance response if notification fails
    }
    
    res.status(201).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    // Handle duplicate key error (E11000)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Attendance already marked for this student on this date',
        code: 'DUPLICATE_ATTENDANCE'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update student attendance record
// @route   PUT /api/student-attendance/:id
// @access  Private
exports.updateAttendance = async (req, res) => {
  try {
    let attendance = await StudentAttendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Restrict teachers to only update their own students' attendance
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      const student = await Student.findById(attendance.student);
      if (!student.subjects.includes(req.user.subject)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this attendance record'
        });
      }
    }

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

    attendance = await StudentAttendance.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('student', 'name studentId class');

    // Process payment actions based on attendance status
    try {
      // Create or find a class record for this date and subject
      const classRecord = await createClassRecordForAttendance(attendance, req.user._id);
      
      const attendanceRecords = [{
        studentId: attendance.student._id,
        isPresent: updateData.status === 'present',
        isTeacherAbsent: updateData.isTeacherAbsent || false,
        isCanceled: updateData.isCanceled || false,
        recordedBy: req.user._id
      }];
      
      await attendancePaymentProcessor.processAttendanceForPayment(
        classRecord._id, // Using class record ID
        attendanceRecords
      );
    } catch (paymentError) {
      // Log payment processing errors but don't fail the attendance update
      console.error('Payment processing error:', paymentError);
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

// @desc    Delete student attendance record
// @route   DELETE /api/student-attendance/:id
// @access  Private/Admin
exports.deleteAttendance = async (req, res) => {
  try {
    const attendance = await StudentAttendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Restrict teachers to only delete their own students' attendance
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      const student = await Student.findById(attendance.student);
      if (!student.subjects.includes(req.user.subject)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this attendance record'
        });
      }
    }

    await attendance.remove();

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

// @desc    Check consecutive absences and update exam eligibility
// @route   POST /api/student-attendance/check-consecutive-absences
// @access  Private
exports.checkConsecutiveAbsences = async (req, res) => {
  try {
    const { studentId, class: studentClass } = req.body;
    
    // Restrict teachers to only check their own students
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      const student = await Student.findById(studentId);
      if (!student.subjects.includes(req.user.subject)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to check this student\'s attendance'
        });
      }
    }
    
    // Get last 3 days of attendance records
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const recentAttendance = await StudentAttendance.find({
      student: studentId,
      class: studentClass,
      date: { $gte: threeDaysAgo },
      status: 'absent'
    }).sort('-date');
    
    // If student has been absent for 3 consecutive days, update exam eligibility
    const isEligible = recentAttendance.length < 3;
    
    // Update student record with eligibility status
    if (!isEligible) {
      await Student.findByIdAndUpdate(studentId, {
        $set: { examEligibility: false }
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        consecutiveAbsences: recentAttendance.length,
        isEligible: isEligible,
        message: isEligible 
          ? 'Student is eligible for exams' 
          : 'Student is not eligible for exams due to 3+ consecutive absences'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get student eligibility status
// @route   GET /api/student-attendance/eligibility/:studentId
// @access  Private
exports.getEligibilityStatus = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Restrict teachers to only see their own students
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      if (!student.subjects.includes(req.user.subject)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this student\'s eligibility status'
        });
      }
    }
    
    // Check if student has been absent for 3 consecutive days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const recentAbsences = await StudentAttendance.find({
      student: student._id,
      date: { $gte: threeDaysAgo },
      status: 'absent'
    }).sort('-date');
    
    const isEligible = recentAbsences.length < 3;
    
    res.status(200).json({
      success: true,
      data: {
        studentId: student._id,
        name: student.name,
        consecutiveAbsences: recentAbsences.length,
        isEligible: isEligible,
        examEligibility: student.examEligibility !== false // Default to true if not set
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};