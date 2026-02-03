const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const teacherAttendanceController = require('../controllers/teacherAttendanceController');
const adminAttendanceController = require('../controllers/adminAttendanceController');

// ========================================
// TEACHER ATTENDANCE MARKING (Admin/Manager/Founder only)
// ========================================

// Mark teacher attendance (present/absent/late)
router.post('/mark', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, teacherAttendanceController.markAttendance);

// Get attendance history
router.get('/history', protect, enforceBranchIsolation, teacherAttendanceController.getAttendanceHistory);

// Get audit trail
router.get('/:id/audit', protect, enforceBranchIsolation, teacherAttendanceController.getAuditTrail);

// Get teacher's statistics
router.get('/stats/my-stats', protect, enforceBranchIsolation, teacherAttendanceController.getMyStats);

// ========================================
// ADMIN ROUTES (Admin/Manager/Founder)
// ========================================

// Get all attendance records
router.get(
  '/admin/all',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.getAllAttendance
);

// Get single attendance details
router.get(
  '/admin/:id/details',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.getAttendanceDetails
);

// Approve attendance
router.put(
  '/admin/:id/approve',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.approveAttendance
);

// Reject attendance
router.put(
  '/admin/:id/reject',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.rejectAttendance
);

// Mark for review
router.put(
  '/admin/:id/review',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.markForReview
);

// Add admin notes
router.put(
  '/admin/:id/notes',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.addAdminNotes
);

// Get admin statistics
router.get(
  '/admin/stats/overview',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.getAdminStats
);

// Get full audit trail (admin)
router.get(
  '/admin/:id/audit-trail',
  protect,
  authorize('admin', 'manager', 'founder'),
  enforceBranchIsolation,
  adminAttendanceController.getFullAuditTrail
);

module.exports = router;
