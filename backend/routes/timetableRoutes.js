const express = require('express');
const router = express.Router();
const {
  getTimetables,
  getTimetable,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getTeacherTimetable
} = require('../controllers/timetableController');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const { 
  restrictToOwnData, 
  blockTeacherAccess 
} = require('../middleware/teacherSecurity');

// Get timetables - teachers see ONLY their own timetable
router.route('/')
  .get(protect, enforceBranchIsolation, restrictToOwnData, getTimetables)
  .post(protect, enforceBranchIsolation, blockTeacherAccess, authorize('admin', 'manager', 'founder'), createTimetable);

// Get teacher timetable - teachers can ONLY access THEIR OWN timetable
router.get('/teacher/:teacherId', protect, enforceBranchIsolation, restrictToOwnData, getTeacherTimetable);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getTimetable)
  .put(protect, enforceBranchIsolation, blockTeacherAccess, authorize('admin', 'manager', 'founder'), updateTimetable)
  .delete(protect, enforceBranchIsolation, blockTeacherAccess, authorize('admin', 'manager', 'founder'), deleteTimetable);

module.exports = router;
