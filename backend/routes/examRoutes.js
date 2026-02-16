const express = require('express');
const router = express.Router();
const {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  addResults,
  enrollStudents,
  updateResult,
  markAbsentFailed,
  updateEnrollmentStatus,
  addStudent,
  removeStudent,
  getStudentExams,
  getExamsDebug
} = require('../controllers/examController');
const { protect, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

router.route('/')
  .get(protect, enforceBranchIsolation, getExams)
  .post(protect, checkPermission('canManageExams'), enforceBranchIsolation, createExam);

// Debug endpoint to check exam data
router.get('/debug/all', protect, getExamsDebug);

// Student-specific route (must come before /:id)
router.get('/student/:studentId', protect, enforceBranchIsolation, getStudentExams);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getExam)
  .put(protect, checkPermission('canManageExams'), enforceBranchIsolation, updateExam)
  .delete(protect, checkPermission('canManageExams'), enforceBranchIsolation, deleteExam);

router.post('/:id/results', protect, checkPermission('canManageExams'), enforceBranchIsolation, addResults);
router.post('/:id/enroll-students', protect, checkPermission('canManageExams'), enforceBranchIsolation, enrollStudents);
router.put('/:id/results/:studentId', protect, checkPermission('canManageExams'), enforceBranchIsolation, updateResult);
router.post('/:id/mark-absent-failed', protect, checkPermission('canManageExams'), enforceBranchIsolation, markAbsentFailed);
router.put('/:id/results/:studentId/status', protect, checkPermission('canManageExams'), enforceBranchIsolation, updateEnrollmentStatus);
router.post('/:id/add-student', protect, checkPermission('canManageExams'), enforceBranchIsolation, addStudent);
router.delete('/:id/remove-student/:studentId', protect, checkPermission('canManageExams'), enforceBranchIsolation, removeStudent);

module.exports = router;