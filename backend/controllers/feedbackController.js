const Feedback = require('../models/Feedback');
const Student = require('../models/Student');
const ClassSchedule = require('../models/ClassSchedule');
const { emitNotificationEvent } = require('../utils/notificationEvents');

// @desc    Debug endpoint to check all feedback
// @route   GET /api/feedback/debug/all
// @access  Private (Founder only)
exports.getFeedbackDebug = async (req, res) => {
  try {
    if (req.user.role !== 'founder') {
      return res.status(403).json({ success: false, message: 'Only founders can access debug data' });
    }
    
    const feedback = await Feedback.find({})
      .select('student teacher schedule subject feedbackDate branchId homework participation behavior')
      .populate('student', 'name studentId')
      .populate('teacher', 'name email')
      .sort('-feedbackDate')
      .limit(50);
    
    res.status(200).json({
      success: true,
      count: feedback.length,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to check if teacher can give feedback NOW
const canGiveFeedbackNow = async (scheduleId) => {
  try {
    const schedule = await ClassSchedule.findById(scheduleId);
    if (!schedule) {
      return { allowed: false, reason: 'Schedule not found' };
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Check if today is a scheduled day
    if (!schedule.scheduledDays || !schedule.scheduledDays.includes(currentDay)) {
      return { 
        allowed: false, 
        reason: `This class is not scheduled for ${currentDay}. Scheduled days: ${schedule.scheduledDays.join(', ')}` 
      };
    }

    // Parse class end time and add 30 minutes
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const classEndDate = new Date();
    classEndDate.setHours(endHour, endMinute, 0, 0);
    
    // Add 30 minutes grace period
    const feedbackDeadline = new Date(classEndDate.getTime() + 30 * 60000);
    const feedbackDeadlineTime = feedbackDeadline.toTimeString().slice(0, 5);

    // Check if current time is between class start and deadline
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const classStartDate = new Date();
    classStartDate.setHours(startHour, startMinute, 0, 0);

    if (now < classStartDate) {
      return {
        allowed: false,
        reason: `Class hasn't started yet. Class time: ${schedule.startTime} - ${schedule.endTime}`
      };
    }

    if (now > feedbackDeadline) {
      return {
        allowed: false,
        reason: `Feedback window closed. You can give feedback from ${schedule.startTime} to ${feedbackDeadlineTime} (class end + 30 min)`
      };
    }

    return { 
      allowed: true, 
      reason: '',
      schedule 
    };
  } catch (error) {
    return { allowed: false, reason: error.message };
  }
};

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Private
exports.getFeedback = async (req, res) => {
  try {
    const { student, schedule, startDate, endDate, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    // Restrict teachers to only see their own feedback
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      query.teacher = req.user._id;
    }

    if (student) query.student = student;
    if (schedule) query.schedule = schedule;
    
    if (startDate && endDate) {
      query.feedbackDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const feedback = await Feedback.find(query)
      .populate('student', 'name studentId email profileImage')
      .populate('teacher', 'name email')
      .populate('schedule', 'subject className startTime endTime scheduledDays')
      .sort('-feedbackDate');

    res.status(200).json({
      success: true,
      count: feedback.length,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get teacher's today's classes (for giving feedback)
// @route   GET /api/feedback/today-classes
// @access  Private
exports.getTodayClasses = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    console.log('📅 Today is:', today);
    
    let query = {
      scheduledDays: today
    };

    // Branch isolation
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }

    // Teachers only see their own classes
    // Admin/Manager/Founder see ALL classes
    if (req.user.role === 'teacher') {
      query.teacher = req.user._id;
    }
    // For admin/manager/founder: no teacher filter, show all classes
    
    console.log('🔍 Query:', JSON.stringify(query));
    
    const schedules = await ClassSchedule.find(query)
      .populate('enrolledStudents', 'name studentId profileImage')
      .populate('teacher', 'name teacherId')
      .sort('startTime');

    console.log(`✅ Found ${schedules.length} classes for ${today}`);

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules,
      debug: {
        today,
        queryUsed: query
      }
    });
  } catch (error) {
    console.error('❌ Error in getTodayClasses:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create daily feedback
// @route   POST /api/feedback
// @access  Private (Teacher)
exports.createFeedback = async (req, res) => {
  try {
    const { 
      student, 
      schedule, 
      homework, 
      behavior, 
      participation, 
      notes, 
      feedbackDate, 
      classLevel,
      isExamDay,
      examPercentage
    } = req.body;

    // Only teachers have time restrictions
    // Admin/Manager/Founder can give feedback anytime
    if (req.user.role === 'teacher') {
      // For teachers, check time window
      const timeCheck = await canGiveFeedbackNow(schedule);
      if (!timeCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: timeCheck.reason,
          code: 'TIME_WINDOW_INVALID'
        });
      }
    }
    // Admin/Manager/Founder: No time restriction, continue without check

    // Get schedule details
    const scheduleDoc = await ClassSchedule.findById(schedule);
    if (!scheduleDoc) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Use provided feedbackDate or default to today
    const selectedDate = feedbackDate ? new Date(feedbackDate) : new Date();
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingFeedback = await Feedback.findOne({
      student,
      schedule,
      feedbackDate: {
        $gte: selectedDate,
        $lt: nextDay
      }
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: `Feedback already submitted for this student on ${selectedDate.toLocaleDateString()}`,
        code: 'ALREADY_SUBMITTED'
      });
    }

    const feedback = await Feedback.create({
      student,
      schedule,
      subject: scheduleDoc.subject,
      classLevel: classLevel || '',
      teacher: req.user._id,
      homework: isExamDay ? 0 : (homework || 0),
      behavior: isExamDay ? 0 : (behavior || 0),
      participation: isExamDay ? 0 : (participation || 0),
      isExamDay: !!isExamDay,
      examPercentage: isExamDay ? examPercentage : null,
      notes: notes || '',
      feedbackDate: selectedDate,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    });

    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('student', 'name studentId profileImage')
      .populate('teacher', 'name')
      .populate('schedule', 'subject className');
    
    // Emit notification event so parents receive Uzbek-only feedback summary
    try {
      const studentDoc = await Student.findById(student);
    
      if (studentDoc) {
        emitNotificationEvent('TEACHER_FEEDBACK', {
          studentId: studentDoc._id,
          eventType: 'TEACHER_FEEDBACK',
          createdAt: new Date(),
          payload: {
            studentFullName: studentDoc.name,
            subjectId: scheduleDoc.subject,
            subjectName: scheduleDoc.subject,
            date: selectedDate,
            teacherId: req.user._id,
            teacherComment: notes || ''
          }
        });
      }
    } catch (notifyError) {
      // Fail silently – feedback creation must not break if notification fails
    }
    
    res.status(201).json({
      success: true,
      data: populatedFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get feedback by student
// @route   GET /api/feedback/student/:studentId
// @access  Private
exports.getFeedbackByStudent = async (req, res) => {
  try {
    let query = { student: req.params.studentId };

    console.log('[FeedbackController] getFeedbackByStudent called');
    console.log('[FeedbackController] req.params.studentId:', req.params.studentId);
    console.log('[FeedbackController] req.user.role:', req.user.role);
    console.log('[FeedbackController] req.user._id:', req.user._id);
    console.log('[FeedbackController] req.user.branchId:', req.user.branchId);
    console.log('[FeedbackController] req.query.branchId:', req.query.branchId);

    // Branch isolation: Only apply to teachers/staff, NOT students viewing their own feedback
    // Students should see ALL their feedback regardless of branchId
    if (req.user.role === 'student') {
      // Students see ALL their feedback - no branch filter
      console.log('[FeedbackController] Student viewing own feedback - no branch filter applied');
    } else if (req.user.role !== 'founder' && req.user.role) {
      // Staff/teachers see only their branch feedback
      query.branchId = req.user.branchId;
      console.log('[FeedbackController] Staff/Teacher - filtering by branchId:', req.user.branchId);
    } else if (req.query.branchId) {
      query.branchId = req.query.branchId;
      console.log('[FeedbackController] Using query.branchId:', req.query.branchId);
    }

    // SECURITY: Teachers can only see feedback THEY created
    if (req.isTeacherRestricted) {
      query.teacher = req.user._id;
      console.log(`✅ Teacher ${req.user._id} restricted to own feedback for student`);
    }

    console.log('[FeedbackController] Final query:', JSON.stringify(query, null, 2));

    const feedback = await Feedback.find(query)
      .populate('teacher', 'name email')
      .populate('schedule', 'subject className startTime endTime')
      .sort('-feedbackDate');

    console.log('[FeedbackController] Found feedback:', feedback.length);
    console.log('[FeedbackController] Feedback IDs:', feedback.map(f => f._id.toString()));

    res.status(200).json({
      success: true,
      count: feedback.length,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add parent comment to feedback
// @route   PUT /api/feedback/:id/parent-comment
// @access  Private (Parent)
exports.addParentComment = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    feedback.parentComments = req.body.comment;
    feedback.parentViewed = true;
    await feedback.save();

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private (Teacher/Admin)
exports.updateFeedback = async (req, res) => {
  try {
    let feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Only teacher who created or admin can update
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      if (feedback.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this feedback'
        });
      }
    }

    const { homework, behavior, participation, notes, classLevel, isExamDay, examPercentage } = req.body;
    
    feedback.homework = isExamDay ? 0 : (homework !== undefined ? homework : feedback.homework);
    feedback.behavior = isExamDay ? 0 : (behavior !== undefined ? behavior : feedback.behavior);
    feedback.participation = isExamDay ? 0 : (participation !== undefined ? participation : feedback.participation);
    feedback.isExamDay = isExamDay !== undefined ? !!isExamDay : feedback.isExamDay;
    feedback.examPercentage = isExamDay ? examPercentage : (isExamDay === false ? null : feedback.examPercentage);
    feedback.notes = notes !== undefined ? notes : feedback.notes;
    feedback.classLevel = classLevel !== undefined ? classLevel : feedback.classLevel;

    await feedback.save();

    const updatedFeedback = await Feedback.findById(feedback._id)
      .populate('student', 'name studentId profileImage')
      .populate('teacher', 'name')
      .populate('schedule', 'subject className');

    res.status(200).json({
      success: true,
      data: updatedFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private (Admin only)
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
