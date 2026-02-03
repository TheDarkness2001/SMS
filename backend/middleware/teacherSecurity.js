/**
 * PERMANENT TEACHER SECURITY MIDDLEWARE
 * 
 * This middleware enforces strict access control for teachers.
 * Teachers can ONLY access their own data - never other teachers' or admin data.
 * 
 * SECURITY RULES:
 * 1. Teachers can only see/modify their own schedules, feedback, earnings
 * 2. Teachers cannot access admin endpoints or global data
 * 3. Teachers cannot choose or modify teacher IDs in requests
 * 4. All teacher filtering happens on the backend, not frontend
 * 5. This applies to ALL current and future teacher endpoints
 * 
 * DO NOT BYPASS OR REMOVE THIS MIDDLEWARE
 */

const ClassSchedule = require('../models/ClassSchedule');
const Feedback = require('../models/Feedback');
const TeacherEarning = require('../models/TeacherEarning');

/**
 * Enforce that teachers can only access their own data
 * This middleware automatically restricts queries to the logged-in teacher
 */
exports.restrictToOwnData = (req, res, next) => {
  // Skip for admins, managers, founders
  if (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'founder') {
    return next();
  }

  // Only apply to teachers
  if (req.user.role !== 'teacher') {
    return next();
  }

  // SECURITY: Teacher trying to access another teacher's data via teacherId param
  if (req.params.teacherId && req.params.teacherId !== req.user._id.toString()) {
    console.log(`🚨 SECURITY VIOLATION: Teacher ${req.user._id} attempted to access teacher ${req.params.teacherId}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own data.'
    });
  }

  // SECURITY: Teacher trying to pass different teacherId in query params
  if (req.query.teacher && req.query.teacher !== req.user._id.toString()) {
    console.log(`🚨 SECURITY VIOLATION: Teacher ${req.user._id} attempted to query teacher ${req.query.teacher}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. You cannot query other teachers\' data.'
    });
  }

  // SECURITY: Teacher trying to pass different teacherId in body
  if (req.body.teacher && req.body.teacher !== req.user._id.toString()) {
    console.log(`🚨 SECURITY VIOLATION: Teacher ${req.user._id} attempted to set teacher ${req.body.teacher} in request body`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. You cannot modify teacher ID in requests.'
    });
  }

  // FORCE: Set teacher filter to logged-in teacher (cannot be bypassed)
  req.teacherFilter = { teacher: req.user._id };
  req.isTeacherRestricted = true;

  console.log(`✅ Teacher ${req.user._id} access restricted to own data`);
  next();
};

/**
 * Validate that a schedule belongs to the logged-in teacher
 * Use this before update/delete operations
 */
exports.validateScheduleOwnership = async (req, res, next) => {
  // Skip for admins
  if (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'founder') {
    return next();
  }

  // Only for teachers
  if (req.user.role !== 'teacher') {
    return next();
  }

  try {
    const scheduleId = req.params.id || req.body.scheduleId || req.body.schedule;
    
    if (!scheduleId) {
      return res.status(400).json({
        success: false,
        message: 'Schedule ID is required'
      });
    }

    const schedule = await ClassSchedule.findById(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // SECURITY CHECK: Does this schedule belong to this teacher?
    if (schedule.teacher.toString() !== req.user._id.toString()) {
      console.log(`🚨 SECURITY VIOLATION: Teacher ${req.user._id} attempted to access schedule ${scheduleId} owned by ${schedule.teacher}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. This schedule does not belong to you.'
      });
    }

    // Attach schedule to request for controller use
    req.validatedSchedule = schedule;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating schedule ownership: ' + error.message
    });
  }
};

/**
 * Validate that feedback belongs to the logged-in teacher
 * Use this before update/delete operations
 */
exports.validateFeedbackOwnership = async (req, res, next) => {
  // Skip for admins
  if (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'founder') {
    return next();
  }

  // Only for teachers
  if (req.user.role !== 'teacher') {
    return next();
  }

  try {
    const feedbackId = req.params.id;
    
    if (!feedbackId) {
      return res.status(400).json({
        success: false,
        message: 'Feedback ID is required'
      });
    }

    const feedback = await Feedback.findById(feedbackId);
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // SECURITY CHECK: Does this feedback belong to this teacher?
    if (feedback.teacher.toString() !== req.user._id.toString()) {
      console.log(`🚨 SECURITY VIOLATION: Teacher ${req.user._id} attempted to access feedback ${feedbackId} created by ${feedback.teacher}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. This feedback does not belong to you.'
      });
    }

    req.validatedFeedback = feedback;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating feedback ownership: ' + error.message
    });
  }
};

/**
 * Prevent teachers from accessing admin-only endpoints
 * Use this on routes that should NEVER be accessible to teachers
 */
exports.blockTeacherAccess = (req, res, next) => {
  if (req.user.role === 'teacher') {
    console.log(`🚨 SECURITY VIOLATION: Teacher ${req.user._id} attempted to access admin endpoint: ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. This endpoint is only available to administrators.'
    });
  }
  next();
};

/**
 * Force teacher ID in create operations
 * Ensures teachers cannot create data for other teachers
 */
exports.forceTeacherIdInBody = (req, res, next) => {
  // Skip for admins (they can specify any teacher)
  if (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'founder') {
    return next();
  }

  // For teachers: FORCE their own ID (ignore any provided teacherId)
  if (req.user.role === 'teacher') {
    req.body.teacher = req.user._id;
    console.log(`✅ Forced teacher ID to ${req.user._id} in request body`);
  }

  next();
};

/**
 * Validate that earnings belong to the logged-in teacher
 */
exports.validateEarningsOwnership = async (req, res, next) => {
  // Skip for admins
  if (req.user.role === 'admin' || req.user.role === 'manager' || req.user.role === 'founder') {
    return next();
  }

  // Only for teachers
  if (req.user.role !== 'teacher') {
    return next();
  }

  // Check if teacherId in params matches logged-in teacher
  if (req.params.teacherId && req.params.teacherId !== req.user._id.toString()) {
    console.log(`🚨 SECURITY VIOLATION: Teacher ${req.user._id} attempted to access earnings for teacher ${req.params.teacherId}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view your own earnings.'
    });
  }

  // FORCE teacherId to logged-in teacher
  req.params.teacherId = req.user._id.toString();
  next();
};

module.exports = exports;
