const ClassSchedule = require('../models/ClassSchedule');
const Teacher = require('../models/Teacher');
const mongoose = require('mongoose');

// @desc    Get all class schedules
// @route   GET /api/class-schedules
// @access  Private
exports.getClassSchedules = async (req, res) => {
  try {
    const { isActive, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const schedules = await ClassSchedule.find(query)
      .populate('teacher', 'name subject')
      .populate('enrolledStudents', 'name studentId profileImage class');
    
    // Manually populate subject only if it's an ObjectId (not a custom string)
    const Subject = require('../models/Subject');
    for (let schedule of schedules) {
      // Check if subject looks like an ObjectId (24 hex characters)
      const isObjectIdString = typeof schedule.subject === 'string' && 
                               /^[0-9a-fA-F]{24}$/.test(schedule.subject);
      const isObjectIdInstance = schedule.subject && 
                                 typeof schedule.subject === 'object' && 
                                 mongoose.Types.ObjectId.isValid(schedule.subject);
      
      if (isObjectIdString || isObjectIdInstance) {
        try {
          const subjectDoc = await Subject.findById(schedule.subject);
          if (subjectDoc) {
            schedule.subject = subjectDoc;
          }
        } catch (err) {
          // If lookup fails, leave as-is (might be invalid ObjectId)
          console.warn('Could not populate subject:', schedule.subject);
        }
      }
      // Otherwise, it's a custom string subject name - leave it as-is
    }
    
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

// @desc    Get single class schedule
// @route   GET /api/class-schedules/:id
// @access  Private
exports.getClassSchedule = async (req, res) => {
  try {
    const schedule = await ClassSchedule.findById(req.params.id)
      .populate('teacher', 'name subject')
      .populate('enrolledStudents', 'name studentId profileImage class');
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Class schedule not found'
      });
    }
    
    // Manually populate subject only if it's an ObjectId (not a custom string)
    const Subject = require('../models/Subject');
    // Check if subject looks like an ObjectId (24 hex characters)
    const isObjectIdString = typeof schedule.subject === 'string' && 
                             /^[0-9a-fA-F]{24}$/.test(schedule.subject);
    const isObjectIdInstance = schedule.subject && 
                               typeof schedule.subject === 'object' && 
                               mongoose.Types.ObjectId.isValid(schedule.subject);
    
    if (isObjectIdString || isObjectIdInstance) {
      try {
        const subjectDoc = await Subject.findById(schedule.subject);
        if (subjectDoc) {
          schedule.subject = subjectDoc;
        }
      } catch (err) {
        console.warn('Could not populate subject:', schedule.subject);
      }
    }
    // Otherwise, it's a custom string subject name - leave it as-is
    
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

// @desc    Create new class schedule
// @route   POST /api/class-schedules
// @access  Private
exports.createClassSchedule = async (req, res) => {
  try {
    // Sanitize enrolledStudents: extract only IDs if objects are sent
    if (req.body.enrolledStudents && Array.isArray(req.body.enrolledStudents)) {
      req.body.enrolledStudents = req.body.enrolledStudents.map(student => {
        if (typeof student === 'object' && student._id) {
          return student._id;
        }
        return student;
      });
    }
    
    // Get teacher details
    const teacher = await Teacher.findById(req.body.teacher);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    const scheduleData = {
      ...req.body,
      teacherName: teacher.name,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    };
    
    const schedule = await ClassSchedule.create(scheduleData);
    
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

// @desc    Update class schedule
// @route   PUT /api/class-schedules/:id
// @access  Private
exports.updateClassSchedule = async (req, res) => {
  try {
    console.log('Update schedule request for ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Sanitize enrolledStudents: extract only IDs if objects are sent
    if (req.body.enrolledStudents && Array.isArray(req.body.enrolledStudents)) {
      req.body.enrolledStudents = req.body.enrolledStudents.map(student => {
        // If it's an object with _id, extract the _id
        if (typeof student === 'object' && student._id) {
          return student._id;
        }
        // Otherwise, assume it's already an ID string
        return student;
      });
    }
    
    // If teacher is being updated, get teacher details
    if (req.body.teacher) {
      const teacher = await Teacher.findById(req.body.teacher);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher not found'
        });
      }
      req.body.teacherName = teacher.name;
    }
    
    const schedule = await ClassSchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Class schedule not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete class schedule
// @route   DELETE /api/class-schedules/:id
// @access  Private
exports.deleteClassSchedule = async (req, res) => {
  try {
    const schedule = await ClassSchedule.findByIdAndDelete(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Class schedule not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Class schedule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};