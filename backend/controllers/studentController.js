const Student = require('../models/Student');
const ParentNotificationSettings = require('../models/ParentNotificationSettings');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const { search, status, branchId } = req.query;
    console.log('[STUDENTS] Request query:', req.query);
    console.log('[STUDENTS] User role:', req.user.role);
    
    let query = {};

    // Only filter by status if explicitly provided and not empty string
    if (status && status.trim() !== '') {
      query.status = status;
    }
    // If status is empty string or not provided, fetch ALL students (no status filter)

    // Branch isolation: Non-founders can only see their branch
    if (req.user.role !== 'founder') {
      query.branchId = req.user.branchId;
    } else if (branchId) {
      // Founders can filter by branch
      query.branchId = branchId;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query).select('-password');

    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    // Parse FormData arrays if they exist
    const studentData = { ...req.body };
    
    // Handle subjects array from FormData
    if (studentData.subjects) {
      if (typeof studentData.subjects === 'string') {
        // Try to parse as JSON array first
        try {
          studentData.subjects = JSON.parse(studentData.subjects);
        } catch (e) {
          // If not JSON, split by comma
          studentData.subjects = studentData.subjects.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }
    
    // Handle paymentSubjects (convert to subjectPayments only - perClassPrices commented out per requirement)
    if (studentData.paymentSubjects) {
      if (typeof studentData.paymentSubjects === 'string') {
        try {
          studentData.subjectPayments = JSON.parse(studentData.paymentSubjects);
        } catch (e) {
          // Extract from array format if parsing fails
          studentData.subjectPayments = [];
        }
      } else if (Array.isArray(studentData.paymentSubjects)) {
        // Already an array, keep as is
        studentData.subjectPayments = studentData.paymentSubjects;
      } else if (typeof studentData.paymentSubjects === 'object') {
        // Convert object format to array
        const paymentArray = [];
        for (let key in studentData.paymentSubjects) {
          if (key.includes('subject')) {
            const match = key.match(/\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1]);
              if (!paymentArray[index]) paymentArray[index] = {};
              paymentArray[index].subject = studentData.paymentSubjects[key];
            }
          } else if (key.includes('amount')) {
            const match = key.match(/\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1]);
              if (!paymentArray[index]) paymentArray[index] = {};
              paymentArray[index].amount = studentData.paymentSubjects[key];
            }
          }
        }
        studentData.subjectPayments = paymentArray.filter(Boolean);
      }
      
      // Remove the old field name
      delete studentData.paymentSubjects;
      
      // Also update perClassPrices map for the payment system
      if (studentData.subjectPayments && studentData.subjectPayments.length > 0) {
        const perClassPrices = {};
        studentData.subjectPayments.forEach(payment => {
          if (payment.subject && payment.amount) {
            // Store by subject name (normalized) for easier lookup in frontend
            perClassPrices[payment.subject.toLowerCase().trim()] = parseFloat(payment.amount);
          }
        });
        studentData.perClassPrices = perClassPrices;
      }
      
      console.log('✅ Payment amounts and per-class prices saved:', studentData.subjectPayments);
    }
    
    // Password is now required - must be provided by admin
    if (!studentData.password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required. Please provide a strong password (minimum 6 characters)'
      });
    }

    // Handle file upload
    if (req.file) {
      studentData.profileImage = req.file.path || req.file.filename;
    } else {
      // Ensure profileImage is not set to empty object
      studentData.profileImage = '';
    }

    // Auto-assign branchId if not founder
    if (req.user.role !== 'founder') {
      studentData.branchId = req.user.branchId;
    }

    const student = await Student.create(studentData);

    res.status(201).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    // Parse FormData arrays if they exist
    const updateData = { ...req.body };
    
    // Handle subjects array from FormData
    if (updateData.subjects) {
      if (typeof updateData.subjects === 'string') {
        try {
          updateData.subjects = JSON.parse(updateData.subjects);
        } catch (e) {
          updateData.subjects = updateData.subjects.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }
    
    // Handle paymentSubjects (convert to subjectPayments only - perClassPrices commented out per requirement)
    if (updateData.paymentSubjects) {
      if (typeof updateData.paymentSubjects === 'string') {
        try {
          updateData.subjectPayments = JSON.parse(updateData.paymentSubjects);
        } catch (e) {
          // Extract from array format if parsing fails
          updateData.subjectPayments = [];
        }
      } else if (Array.isArray(updateData.paymentSubjects)) {
        // Already an array, keep as is
        updateData.subjectPayments = updateData.paymentSubjects;
      } else if (typeof updateData.paymentSubjects === 'object') {
        // Convert object format to array
        const paymentArray = [];
        for (let key in updateData.paymentSubjects) {
          if (key.includes('subject')) {
            const match = key.match(/\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1]);
              if (!paymentArray[index]) paymentArray[index] = {};
              paymentArray[index].subject = updateData.paymentSubjects[key];
            }
          } else if (key.includes('amount')) {
            const match = key.match(/\[(\d+)\]/);
            if (match) {
              const index = parseInt(match[1]);
              if (!paymentArray[index]) paymentArray[index] = {};
              paymentArray[index].amount = updateData.paymentSubjects[key];
            }
          }
        }
        updateData.subjectPayments = paymentArray.filter(Boolean);
      }
      
      // Remove the old field name
      delete updateData.paymentSubjects;
      
      // Also update perClassPrices map for the payment system
      if (updateData.subjectPayments && updateData.subjectPayments.length > 0) {
        const perClassPrices = {};
        updateData.subjectPayments.forEach(payment => {
          if (payment.subject && payment.amount) {
            // Store by subject name (normalized) for easier lookup in frontend
            perClassPrices[payment.subject.toLowerCase().trim()] = parseFloat(payment.amount);
          }
        });
        updateData.perClassPrices = perClassPrices;
      }
      
      console.log('✅ Payment amounts and per-class prices updated:', updateData.subjectPayments);
    }
    
    // Allow password update if provided
    if (updateData.password) {
      // Password will be hashed by the pre-save hook
    } else {
      // Don't allow modifying password if not explicitly provided
      delete updateData.password;
    }

    // Handle file upload
    if (req.file) {
      updateData.profileImage = req.file.path || req.file.filename;
    }

    let student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Update fields manually to trigger hooks
    Object.keys(updateData).forEach(key => {
      student[key] = updateData[key];
    });

    await student.save();
    
    // Select after save to avoid password leak in response
    student = await Student.findById(student._id).select('-password -parentPassword');

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload student profile image
// @route   PUT /api/students/:id/photo
// @access  Private
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { profileImage: req.file.path || req.file.filename },
      { new: true }
    ).select('-parentPassword');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update parent notification settings for a student
// @route   PATCH /api/students/:id/notification-settings
// @access  Private (Parent or Staff)
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { enable } = req.body;

    // Basic validation
    if (typeof enable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'enable must be a boolean'
      });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const update = enable
      ? { notificationsEnabled: true, notificationChannels: ['push', 'sms'] }
      : { notificationsEnabled: false, notificationChannels: [] };

    const settings = await ParentNotificationSettings.findOneAndUpdate(
      { student: student._id },
      update,
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register Web Push device token for parent notifications
// @route   POST /api/students/:id/push-token
// @access  Private (Parent or Staff)
exports.registerPushToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid push token is required'
      });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const settings = await ParentNotificationSettings.findOneAndUpdate(
      { student: student._id },
      {
        $setOnInsert: {
          notificationsEnabled: true,
          notificationChannels: ['push', 'sms']
        },
        $addToSet: { deviceTokens: token }
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
