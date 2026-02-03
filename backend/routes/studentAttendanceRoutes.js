const express = require('express');
const router = express.Router();
const {
  getAttendance,
  getSingleAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  checkConsecutiveAbsences,
  getEligibilityStatus,
  getByStudent
} = require('../controllers/studentAttendanceController');
const { protect, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

router.route('/')
  .get(protect, enforceBranchIsolation, getAttendance)
  .post(protect, checkPermission('canManageAttendance'), enforceBranchIsolation, createAttendance);

// Student-specific route - must come before /:id to avoid conflicts
router.get('/student/:studentId', protect, enforceBranchIsolation, getByStudent);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getSingleAttendance)
  .put(protect, checkPermission('canManageAttendance'), enforceBranchIsolation, updateAttendance)
  .delete(protect, checkPermission('canManageAttendance'), enforceBranchIsolation, deleteAttendance);

router.post('/check-consecutive-absences', protect, checkPermission('canManageAttendance'), enforceBranchIsolation, checkConsecutiveAbsences);
router.get('/eligibility/:studentId', protect, enforceBranchIsolation, getEligibilityStatus);

module.exports = router;