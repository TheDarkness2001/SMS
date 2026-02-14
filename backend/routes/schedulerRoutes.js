const express = require('express');
const router = express.Router();
const {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedulesByTeacher,
  getAllSchedulesDebug,
  fixMissingBranchIds
} = require('../controllers/schedulerController');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { 
  restrictToOwnData, 
  validateScheduleOwnership, 
  blockTeacherAccess,
  forceTeacherIdInBody 
} = require('../middleware/teacherSecurity');

// All routes require authentication
router.use(protect);

// Debug routes (admin only)
router.route('/debug/all')
  .get(authorize('admin', 'manager', 'founder'), getAllSchedulesDebug);

router.route('/debug/fix-branch')
  .post(authorize('admin', 'manager', 'founder'), fixMissingBranchIds);

// GET schedules - teachers see only THEIR schedules, students see only enrolled schedules
// Admin, Manager, Founder see ALL schedules
router.route('/')
  .get(restrictToOwnData, getSchedules) // Teacher security applied
  .post(blockTeacherAccess, authorize('admin', 'manager', 'founder'), createSchedule); // Teachers CANNOT create

router.route('/teacher/:teacherId')
  .get(restrictToOwnData, getSchedulesByTeacher); // Teachers can only see their own

router.route('/:id')
  .get(restrictToOwnData, getSchedule) // Teachers can only view their own schedules
  .put(validateScheduleOwnership, authorize('admin', 'manager', 'founder'), updateSchedule) // Teachers CANNOT update
  .delete(validateScheduleOwnership, authorize('admin', 'manager', 'founder'), deleteSchedule); // Teachers CANNOT delete

module.exports = router;