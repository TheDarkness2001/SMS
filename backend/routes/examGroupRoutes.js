const express = require('express');
const router = express.Router();
const {
  getGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  addStudentToGroup,
  removeStudentFromGroup
} = require('../controllers/examGroupController');
const { protect, authorize } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

// Get all groups - accessible to all authenticated users
router.get('/', protect, enforceBranchIsolation, getGroups);

// Get single group
router.get('/:id', protect, enforceBranchIsolation, getGroup);

// Create group - admin/manager only
router.post('/', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, createGroup);

// Update group - admin/manager only
router.put('/:id', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, updateGroup);

// Delete group - admin/manager only
router.delete('/:id', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, deleteGroup);

// Add student to group
router.post('/:id/students', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, addStudentToGroup);

// Remove student from group
router.delete('/:id/students/:studentId', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, removeStudentFromGroup);

module.exports = router;
