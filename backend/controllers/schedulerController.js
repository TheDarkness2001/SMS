const ClassSchedule = require('../models/ClassSchedule');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');

// @desc    Get all schedules
// @route   GET /api/scheduler
// @access  Private (Admin, Manager, Founder, Teachers with permission)
exports.getSchedules = async (req, res) => {
  try {
    const { teacher, branchId } = req.query;
    let query = {};
    
    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }
    
    // Use teacherFilter from middleware if set (for teacher restrictions)
    if (req.teacherFilter && req.teacherFilter.teacher) {
      query.teacher = { $in: [req.teacherFilter.teacher, req.teacherFilter.teacher.toString()] };
    }
    // Filter by teacher if provided in query params (for admin filtering)
    else if (teacher) {
      query.teacher = { $in: [teacher, teacher.toString()] };
    }
    // If user is a student, only show schedules they're enrolled in
    else if (req.userType === 'student') {
      query.enrolledStudents = req.user._id;
    }
    // If user is a teacher (not admin), only show their schedules
    else if (req.user.role === 'teacher') {
      query.teacher = { $in: [req.user._id, req.user._id.toString()] };
    }
    // Admin, Manager, Founder see all schedules (no filter)
    
    console.log('[Scheduler] User ID:', req.user._id, 'type:', typeof req.user._id);
    console.log('[Scheduler] Query:', JSON.stringify(query));
    console.log('[Scheduler] User role:', req.user.role);
    
    // Debug: Check all schedules for this branch to see what's available
    const allSchedules = await ClassSchedule.find({ branchId: query.branchId }).select('className teacher startTime endTime');
    console.log('[Scheduler] All schedules in branch:', allSchedules.length);
    console.log('[Scheduler] All schedules details:', allSchedules.map(s => ({
      className: s.className,
      teacher: s.teacher?.toString() || s.teacher,
      startTime: s.startTime,
      endTime: s.endTime
    })));
    
    const schedules = await ClassSchedule.find(query)
      .populate('teacher', 'name email')
      .populate('subject', 'name pricePerClass')
      .populate('enrolledStudents', 'name studentId profileImage')
      .populate('subjectGroup', 'groupId groupName class subject level')
      .sort('-createdAt');

    console.log('[Scheduler] Schedules found for teacher:', schedules.length);

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    console.error('Error in getSchedules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get schedule by ID
// @route   GET /api/scheduler/:id
// @access  Private
exports.getSchedule = async (req, res) => {
  try {
    const schedule = await ClassSchedule.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('subject', 'name pricePerClass')
      .populate('enrolledStudents', 'name studentId profileImage')
      .populate('subjectGroup', 'groupId groupName class subject level students teachers');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check permissions - teachers can only view their own schedules
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder' && 
        schedule.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this schedule'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new schedule
// @route   POST /api/scheduler
// @access  Private (Admin, Manager, Founder, Teachers with permission)
exports.createSchedule = async (req, res) => {
  try {
    const { className, section, subject, subjectGroup, enrolledStudents, teacher, roomNumber, scheduledDays, 
            frequency, startTime, endTime } = req.body;

    // Skip student enrollment validation - groups handle their own enrollment
    // The subject field is an ObjectId reference, not a name to validate against student.subjects array

    // Check for scheduling conflicts (time/teacher/room on same days)
    const conflictQuery = {
      $or: [
        // Same teacher at same time
        {
          teacher: teacher,
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        },
        // Same room at same time
        {
          roomNumber: roomNumber,
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    };

    const potentialConflicts = await ClassSchedule.find(conflictQuery);
    
    // Check if any conflicts occur on the same day
    const hasConflict = potentialConflicts.some(existing => {
      const existingDays = existing.scheduledDays || [];
      const newDays = scheduledDays || [];
      // Check if there's any overlap in days
      return existingDays.some(day => newDays.includes(day));
    });
    
    if (hasConflict) {
      return res.status(400).json({
        success: false,
        message: 'Scheduling conflict detected. Same teacher/room has a class at this time on one of the selected days.'
      });
    }

    // Get teacher name
    const teacherDoc = await Teacher.findById(teacher);
    if (!teacherDoc) {
      return res.status(400).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Determine branchId
    let scheduleBranchId;
    if (req.user.role !== 'founder') {
      // Non-founders use their assigned branch
      scheduleBranchId = req.user.branchId;
    } else {
      // Founders must provide branchId
      scheduleBranchId = req.body.branchId;
      if (!scheduleBranchId) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID is required for founders'
        });
      }
    }

    const schedule = await ClassSchedule.create({
      className,
      section,
      subject,
      subjectGroup,
      enrolledStudents,
      teacher,
      teacherName: teacherDoc.name,
      roomNumber,
      scheduledDays,
      frequency,
      startTime,
      endTime,
      branchId: scheduleBranchId
    });
    
    // Populate the created schedule before returning
    await schedule.populate([
      { path: 'teacher', select: 'name email' },
      { path: 'subject', select: 'name pricePerClass' },
      { path: 'enrolledStudents', select: 'name studentId' },
      { path: 'subjectGroup', select: 'groupId groupName class subject level' }
    ]);

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update schedule
// @route   PUT /api/scheduler/:id
// @access  Private (Admin, Manager, Founder, Teachers with permission)
exports.updateSchedule = async (req, res) => {
  try {
    console.log('Update schedule request for ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    let schedule = await ClassSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check permissions - teachers can only update their own schedules
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder' && 
        schedule.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this schedule'
      });
    }

    const { className, section, subject, subjectGroup, enrolledStudents, teacher, roomNumber, scheduledDays, 
            frequency, startTime, endTime } = req.body;

    // Skip student enrollment validation - groups handle their own enrollment
    // The subject field is an ObjectId reference, not a name to validate against student.subjects array

    // Check for scheduling conflicts (time/teacher/room on same days) excluding current schedule
    const conflictQuery = {
      _id: { $ne: req.params.id },
      $or: [
        // Same teacher at same time
        {
          teacher: teacher,
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        },
        // Same room at same time
        {
          roomNumber: roomNumber,
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    };

    const potentialConflicts = await ClassSchedule.find(conflictQuery);
    
    // Check if any conflicts occur on the same day
    const hasConflict = potentialConflicts.some(existing => {
      const existingDays = existing.scheduledDays || [];
      const newDays = scheduledDays || [];
      // Check if there's any overlap in days
      return existingDays.some(day => newDays.includes(day));
    });
    
    if (hasConflict) {
      return res.status(400).json({
        success: false,
        message: 'Scheduling conflict detected. Same teacher/room has a class at this time on one of the selected days.'
      });
    }

    // Get teacher name
    const teacherDoc = await Teacher.findById(teacher);
    if (!teacherDoc) {
      return res.status(400).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    schedule = await ClassSchedule.findByIdAndUpdate(req.params.id, {
      className,
      section,
      subject,
      subjectGroup,
      enrolledStudents,
      teacher,
      teacherName: teacherDoc.name,
      roomNumber,
      scheduledDays,
      frequency,
      startTime,
      endTime,
      branchId: req.user.role !== 'founder' ? req.user.branchId : (req.body.branchId || schedule.branchId)
    }, {
      new: true,
      runValidators: true
    })
    .populate('teacher', 'name email')
    .populate('subject', 'name pricePerClass')
    .populate('enrolledStudents', 'name studentId profileImage')
    .populate('subjectGroup', 'groupId groupName class subject level');

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Delete schedule
// @route   DELETE /api/scheduler/:id
// @access  Private (Admin, Manager, Founder, Teachers with permission)
exports.deleteSchedule = async (req, res) => {
  try {
    const schedule = await ClassSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check permissions - teachers can only delete their own schedules
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder' && 
        schedule.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this schedule'
      });
    }

    await ClassSchedule.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Debug endpoint to check all schedules (admin only)
// @route   GET /api/scheduler/debug/all
// @access  Private (Admin only)
exports.getAllSchedulesDebug = async (req, res) => {
  try {
    // Only allow admins/founders
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    const schedules = await ClassSchedule.find()
      .select('className teacher teacherName startTime endTime scheduledDays branchId subjectGroup enrolledStudents')
      .sort('-createdAt');
    
    // Format the response to show teacher ID details
    const formattedSchedules = schedules.map(s => ({
      _id: s._id,
      className: s.className,
      teacher: s.teacher,
      teacherType: typeof s.teacher,
      teacherName: s.teacherName,
      teacherString: s.teacher?.toString(),
      startTime: s.startTime,
      endTime: s.endTime,
      scheduledDays: s.scheduledDays,
      branchId: s.branchId,
      subjectGroup: s.subjectGroup,
      enrolledStudentsCount: s.enrolledStudents?.length || 0
    }));
    
    res.status(200).json({
      success: true,
      count: schedules.length,
      currentUser: {
        id: req.user._id,
        idType: typeof req.user._id,
        idString: req.user._id.toString(),
        role: req.user.role,
        branchId: req.user.branchId
      },
      data: formattedSchedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Fix schedules with missing branchId (admin only)
// @route   POST /api/scheduler/debug/fix-branch
// @access  Private (Admin only)
exports.fixMissingBranchIds = async (req, res) => {
  try {
    // Only allow admins/founders
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    // Find all schedules with null or missing branchId
    const schedulesToFix = await ClassSchedule.find({
      $or: [
        { branchId: null },
        { branchId: { $exists: false } }
      ]
    });
    
    console.log(`[Scheduler Debug] Found ${schedulesToFix.length} schedules with missing branchId`);
    
    // Update them with the admin's branchId (or a default)
    const defaultBranchId = req.user.branchId || '697a2126d4b852066eed6add';
    
    const updatePromises = schedulesToFix.map(schedule => {
      return ClassSchedule.findByIdAndUpdate(
        schedule._id,
        { branchId: defaultBranchId },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      message: `Fixed ${schedulesToFix.length} schedules`,
      fixedCount: schedulesToFix.length,
      fixedSchedules: schedulesToFix.map(s => ({
        _id: s._id,
        className: s.className,
        teacherName: s.teacherName,
        startTime: s.startTime,
        endTime: s.endTime
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get schedules by teacher
// @route   GET /api/scheduler/teacher/:teacherId
// @access  Private
exports.getSchedulesByTeacher = async (req, res) => {
  try {
    const query = { teacher: req.params.teacherId };
    
    // Branch isolation
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }

    const schedules = await ClassSchedule.find(query)
      .populate('teacher', 'name email')
      .populate('enrolledStudents', 'name studentId profileImage')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};