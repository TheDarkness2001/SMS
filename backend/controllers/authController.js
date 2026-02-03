const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// Generate JWT Token
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Unified login - teachers and students
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Try teacher login first
    const teacher = await Teacher.findOne({ email }).select('+password');
    
    if (teacher) {
      const isMatch = await teacher.comparePassword(password);
      
      if (isMatch) {
        const token = generateToken(teacher._id, 'teacher');
        return res.status(200).json({
          success: true,
          token,
          user: {
            id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            role: teacher.role,
            branchId: teacher.branchId,
            permissions: teacher.permissions,
            profileImage: teacher.profileImage,
            teacherId: teacher.teacherId,
            userType: 'teacher'
          }
        });
      }
    }

    // Try student login
    const student = await Student.findOne({ email }).select('+password');
    
    if (student) {
      const isMatch = await student.comparePassword(password);
      
      if (isMatch) {
        const token = generateToken(student._id, 'student');
        return res.status(200).json({
          success: true,
          token,
          user: {
            id: student._id,
            name: student.name,
            email: student.email,
            branchId: student.branchId,
            studentId: student.studentId,
            profileImage: student.profileImage,
            userType: 'student'
          }
        });
      }
    }

    // No matching teacher or student found
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Teacher login
// @route   POST /api/auth/teacher/login
// @access  Public
exports.teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const teacher = await Teacher.findOne({ email }).select('+password');

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await teacher.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(teacher._id, 'teacher');

    res.status(200).json({
      success: true,
      token,
      user: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        branchId: teacher.branchId,
        permissions: teacher.permissions,
        profileImage: teacher.profileImage,
        teacherId: teacher.teacherId,
        userType: 'teacher'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Student login
// @route   POST /api/auth/student/login
// @access  Public
exports.studentLogin = async (req, res) => {
  try {
    console.log('Student login attempt:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const student = await Student.findOne({ email }).select('+password');
    console.log('Student found:', !!student);

    if (!student) {
      console.log('Student not found with email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await student.comparePassword(password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(student._id, 'student');
    console.log('Student login successful:', student.name);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: student._id,
        name: student.name,
        email: student.email,
        branchId: student.branchId,
        studentId: student.studentId,
        profileImage: student.profileImage,
        userType: 'student'
      }
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    if (req.userType === 'teacher') {
      const teacher = await Teacher.findById(req.user._id);
      res.status(200).json({
        success: true,
        data: {
          ...teacher.toObject(),
          userType: 'teacher'
        }
      });
    } else if (req.userType === 'student') {
      const student = await Student.findById(req.user._id);
      res.status(200).json({
        success: true,
        data: {
          ...student.toObject(),
          userType: 'student'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};