const Subject = require('../models/Subject');

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
exports.getSubjects = async (req, res) => {
  try {
    let query = { status: 'active' };

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      // Founders can filter by branch
      query.branchId = req.query.branchId;
    }

    const subjects = await Subject.find(query);

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
exports.getSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    res.status(200).json({
      success: true,
      data: subject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private/Admin
exports.createSubject = async (req, res) => {
  try {
    const { name, code, description, branchId } = req.body;

    // Determine target branch
    const targetBranchId = req.user.role !== 'founder' ? req.user.branchId : branchId;

    // Check if subject already exists in this branch
    const existingSubject = await Subject.findOne({ name, branchId: targetBranchId });
    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: 'Subject already exists in this branch'
      });
    }

    const subject = await Subject.create({
      name,
      code,
      description,
      branchId: targetBranchId
    });

    res.status(201).json({
      success: true,
      data: subject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private/Admin
exports.updateSubject = async (req, res) => {
  try {
    let subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Check if new name already exists (excluding current subject)
    if (req.body.name && req.body.name !== subject.name) {
      const existingSubject = await Subject.findOne({ name: req.body.name });
      if (existingSubject) {
        return res.status(400).json({
          success: false,
          message: 'Subject name already exists'
        });
      }
    }

    subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: subject
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private/Admin
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Subject deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
