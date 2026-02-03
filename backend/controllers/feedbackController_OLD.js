const Feedback = require('../models/Feedback');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const ClassSchedule = require('../models/ClassSchedule');

// Helper function to check if feedback can be submitted
const canSubmitFeedback = async (userRole, studentId) => {
  // Admin, Manager, and Founder can always submit feedback
  if (userRole === 'admin' || userRole === 'manager' || userRole === 'founder') {
    return { allowed: true, reason: '' };
  }

  // For teachers, allow submission anytime
  return { allowed: true, reason: '' };
};

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Private
exports.getFeedback = async (req, res) => {
  try {
    const { student, teacher, status, academicYear, term } = req.query;
    let query = {};

    // Restrict teachers to only see their own feedback
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder') {
      query.teacher = req.user._id;
    }

    if (student) query.student = student;
    if (teacher) query.teacher = teacher;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;

    const feedback = await Feedback.find(query)
      .populate('student', 'name studentId email')
      .populate('teacher', 'name email subject')
      .populate('lastUpdatedBy', 'name')
      .sort('-createdAt');

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

// @desc    Get single feedback
// @route   GET /api/feedback/:id
// @access  Private
exports.getSingleFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('student', 'name studentId email phone parentName parentEmail')
      .populate('teacher', 'name email subject phone')
      .populate('lastUpdatedBy', 'name email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Restrict teachers to only see their own feedback
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder' && 
        feedback.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this feedback'
      });
    }

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

// @desc    Create new feedback
// @route   POST /api/feedback
// @access  Private
exports.createFeedback = async (req, res) => {
  try {
    const feedbackData = {
      ...req.body,
      teacher: req.user._id,
      lastUpdatedBy: req.user._id
    };

    // Verify that the teacher is assigned to this student for this subject
    const student = await Student.findById(feedbackData.student);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check time window permission for teachers
    const timeWindowCheck = await canSubmitFeedback(
      req.user.role,
      feedbackData.student
    );

    if (!timeWindowCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: timeWindowCheck.reason,
        code: 'TIME_WINDOW_EXPIRED'
      });
    }

    // For teachers, verify they are assigned to teach this student
    if (req.user.role === 'teacher') {
      // Allow all teachers to submit feedback for now
      // Future: Add teacher-student relationship validation if needed
    }

    const feedback = await Feedback.create(feedbackData);

    res.status(201).json({
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
// @access  Private
exports.updateFeedback = async (req, res) => {
  try {
    let feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Restrict teachers to only update their own feedback
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder' && 
        feedback.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this feedback'
      });
    }

    const updateData = {
      ...req.body,
      lastUpdatedBy: req.user._id
    };

    feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('student', 'name studentId class');

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

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // CHECK PERMISSION BEFORE DELETION
    // Restrict teachers to only delete their own feedback
    if (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'founder' && 
        feedback.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this feedback'
      });
    }

    // NOW DELETE (only if authorized)
    await Feedback.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get feedback by student (for parents and students)
// @route   GET /api/feedback/student/:studentId
// @access  Private
exports.getStudentFeedback = async (req, res) => {
  try {
    // Students and parents can only see their own feedback
    if (req.userType === 'parent' || req.userType === 'student') {
      if (req.user._id.toString() !== req.params.studentId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this student\'s feedback'
        });
      }
    }

    const feedback = await Feedback.find({ student: req.params.studentId })
      .populate('teacher', 'name email subject')
      .populate('student', 'name studentId class')
      .sort('-createdAt');

    // Mark as viewed by parent/student
    if (req.userType === 'parent' || req.userType === 'student') {
      await Feedback.updateMany(
        { student: req.params.studentId, parentViewed: false },
        { parentViewed: true }
      );
    }

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

// @desc    Add parent comments
// @route   PUT /api/feedback/:id/parent-comment
// @access  Private (Parent only)
exports.addParentComment = async (req, res) => {
  try {
    const { parentComments } = req.body;

    // Get feedback first for authorization check
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Parents can only add comments to their own child's feedback
    if (req.userType === 'parent') {
      if (feedback.student.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add comments to this feedback'
        });
      }
    }

    const updatedFeedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { parentComments, parentViewed: true },
      { new: true }
    ).populate('student', 'name studentId');

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

// @desc    Get teacher's classes and students
// @route   GET /api/feedback/teacher/classes
// @access  Private (Teacher only)
exports.getTeacherClasses = async (req, res) => {
  try {
    // Only teachers can access this endpoint
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access this resource'
      });
    }

    // Get timetable entries for this teacher
    const timetableEntries = await Timetable.find({
      'periods.teacher': req.user._id,
      isActive: true
    }).populate('periods.teacher', 'name email');

    // Get class schedule entries for this teacher
    const classSchedules = await ClassSchedule.find({
      teacher: req.user._id,
      isActive: true
    });

    // Combine unique classes from both sources
    const classes = new Map();

    // Process timetable entries
    timetableEntries.forEach(entry => {
      entry.periods
        .filter(period => period.teacher && period.teacher._id.toString() === req.user._id.toString())
        .forEach(period => {
          const classKey = `${entry.class}-${entry.section}`;
          if (!classes.has(classKey)) {
            classes.set(classKey, {
              class: entry.class,
              section: entry.section,
              subject: period.subject
            });
          }
        });
    });

    // Process class schedules
    classSchedules.forEach(schedule => {
      const classKey = `${schedule.className}-${schedule.section}`;
      if (!classes.has(classKey)) {
        classes.set(classKey, {
          class: schedule.className,
          section: schedule.section,
          subject: schedule.subject
        });
      }
    });

    const uniqueClasses = Array.from(classes.values());

    // Get students for each class
    const classDetails = await Promise.all(uniqueClasses.map(async (cls) => {
      const students = await Student.find({
        class: cls.class,
        section: cls.section
      }, 'name studentId class section');

      return {
        ...cls,
        studentCount: students.length,
        students: students
      };
    }));

    res.status(200).json({
      success: true,
      data: classDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};