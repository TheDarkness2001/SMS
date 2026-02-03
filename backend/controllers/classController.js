const Class = require('../models/Class');
const { validationResult } = require('express-validator');

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
exports.getClasses = async (req, res) => {
  try {
    const { startDate, endDate, teacher, subject, status, student, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    // Add date filters
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Add other filters
    if (teacher) query.teacherId = teacher;
    if (subject) query.subjectId = subject;
    if (status) query.status = status;

    // If filtering by student, we need to find classes where the student is enrolled
    if (student) {
      query.students = { $elemMatch: { studentId: student } };
    }

    const classes = await Class.find(query)
      .populate('teacherId', 'name email')
      .populate('subjectId', 'name pricePerClass')
      .populate('students.studentId', 'name studentId')
      .sort({ date: -1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
exports.getClass = async (req, res) => {
  try {
    const classRecord = await Class.findById(req.params.id)
      .populate('teacherId', 'name email')
      .populate('subjectId', 'name pricePerClass')
      .populate('students.studentId', 'name studentId');

    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    res.status(200).json({
      success: true,
      data: classRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create class
// @route   POST /api/classes
// @access  Private
exports.createClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const classRecord = await Class.create({
      ...req.body,
      recordedBy: req.user._id,
      branchId: req.user.role !== 'founder' ? req.user.branchId : req.body.branchId
    });

    res.status(201).json({
      success: true,
      data: classRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private
exports.updateClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let classRecord = await Class.findById(req.params.id);
    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    classRecord = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('teacherId', 'name email')
      .populate('subjectId', 'name pricePerClass')
      .populate('students.studentId', 'name studentId');

    res.status(200).json({
      success: true,
      data: classRecord
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private
exports.deleteClass = async (req, res) => {
  try {
    const classRecord = await Class.findById(req.params.id);
    if (!classRecord) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    await classRecord.remove();

    res.status(200).json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};