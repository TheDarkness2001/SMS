const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  
  
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    console.log('[AUTH] Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[AUTH] Token decoded:', { id: decoded.id, userType: decoded.userType });
    
    if (decoded.userType === 'teacher') {
      req.user = await Teacher.findById(decoded.id);
      req.userType = 'teacher';
      console.log('[AUTH] Teacher found:', req.user ? { id: req.user._id, role: req.user.role } : 'NOT FOUND');
      // Attach branchId and role to req.user for branch isolation
      if (req.user) {
        req.user.branchId = req.user.branchId || null;
        req.user.role = req.user.role || null;
      }
    } else if (decoded.userType === 'parent') {
      req.user = await Student.findById(decoded.id);
      req.userType = 'parent';
      if (req.user) req.user.role = 'parent';
    } else if (decoded.userType === 'student') {
      req.user = await Student.findById(decoded.id);
      req.userType = 'student';
      if (req.user) req.user.role = 'student';
    }

    
    
    if (!req.user) {
      console.log('[AUTH] User not found in database');
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('[AUTH] Authentication successful for user:', req.user._id);
    next();
  } catch (error) {
    console.log('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Check if user has specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Safely extract user role (handles parent users who don't have role field)
    const userRole = req.user?.role || null;
    
    
    
    // Check if user has a role field (parents don't)
    if (!userRole) {
      
      return res.status(403).json({
        success: false,
        message: 'User role undefined. Access denied.'
      });
    }
    
    // Full access for admin, managers and founders
    if (userRole === 'admin' || userRole === 'manager' || userRole === 'founder') {
      return next();
    }
    
    // Check if user has one of the specified roles
    if (!roles.includes(userRole)) {
      
      return res.status(403).json({
        success: false,
        message: `User role ${userRole} is not authorized to access this route. Required: ${roles.join(', ')}`
      });
    }
    
    next();
  };
};

// Check specific permissions
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    // Allow both teachers and parents/students for appropriate operations
    const isTeacher = req.userType === 'teacher';
    const isParent = req.userType === 'parent';
    const isStudent = req.userType === 'student';
    
    // For non-teacher users
    if (!isTeacher && !isParent && !isStudent) {
      return res.status(403).json({
        success: false,
        message: 'User type not recognized'
      });
    }

    // For students and parents, check if they have a role field
    // Students don't have roles, so handle them separately
    if (isStudent || isParent) {
      // Full access for managers and founders (if they somehow have student/parent type)
      const userRole = req.user?.role?.toLowerCase().trim();
      if (userRole === 'manager' || userRole === 'founder' || userRole === 'admin') {
        return next();
      }
      // For regular students/parents on feedback endpoints, allow without permission check
      if (req.originalUrl.includes('feedback') || req.originalUrl.includes('students')) {
        return next();
      }
      // Allow students to access their own data
      return next();
    }

    // Full access for managers and founders
    const userRole = req.user?.role?.toLowerCase().trim();
    if (userRole === 'manager' || userRole === 'founder' || userRole === 'admin') {
      return next();
    }

    // Teachers: check permissions from database
    if (isTeacher) {
      if (!req.user.permissions || !req.user.permissions[permission]) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }
    }

    next();
  };
};