const Teacher = require('../models/Teacher');

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Private
exports.getTeachers = async (req, res) => {
  try {
    console.log('GET /api/teachers - Request received');
    console.log('User:', req.user ? req.user._id : 'No user');
    console.log('Query params:', req.query);
    
    const { subject, status, search, branchId } = req.query;
    let query = {};

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }

    if (subject) query.subject = { $in: [subject] }; // Array contains the subject
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const teachers = await Teacher.find(query).select('-password');
    console.log('Found teachers:', teachers.length);

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers
    });
  } catch (error) {
    console.error('Error in getTeachers:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Private
exports.getTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).select('-password');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new teacher
// @route   POST /api/teachers
// @access  Private/Admin
exports.createTeacher = async (req, res) => {
  try {
    // Generate teacherId by finding the highest existing ID
    const lastTeacher = await Teacher.findOne({ teacherId: { $exists: true, $ne: null } }).sort({ teacherId: -1 });
    let nextId = 1;
    
    if (lastTeacher && lastTeacher.teacherId) {
      // Extract the numeric part after 'T'
      const numericPart = lastTeacher.teacherId.substring(1);
      if (numericPart && !isNaN(numericPart)) {
        const lastNumber = parseInt(numericPart);
        nextId = lastNumber + 1;
      }
    }
    
    const teacherId = `T${String(nextId).padStart(4, '0')}`;
    
    // Auto-assign branchId if not founder
    const teacherData = { ...req.body, teacherId };
    if (req.user.role !== 'founder') {
      teacherData.branchId = req.user.branchId;
    }
    
    const teacher = await Teacher.create(teacherData);

    res.status(201).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Teacher creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private/Admin
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'password') {
        // Allow updating teacherId only if it's currently empty/missing
        if (key === 'teacherId' && teacher.teacherId) {
          // Skip - don't overwrite existing teacherId
          return;
        }
        teacher[key] = req.body[key];
      }
    });

    // Update password if provided
    if (req.body.password) {
      teacher.password = req.body.password;
    }

    await teacher.save();

    // Remove password from response
    const updatedTeacher = teacher.toObject();
    delete updatedTeacher.password;

    res.status(200).json({
      success: true,
      data: updatedTeacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete teacher
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload teacher profile image
// @route   PUT /api/teachers/:id/photo
// @access  Private
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { profileImage: req.file.filename },
      { new: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update teacher permissions
// @route   PUT /api/teachers/:id/permissions
// @access  Private/Admin
exports.updatePermissions = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { permissions: req.body },
      { new: true, runValidators: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
