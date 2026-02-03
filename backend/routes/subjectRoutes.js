const express = require('express');
const router = express.Router();
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

// Get all subjects - accessible to all authenticated users
router.get('/', protect, enforceBranchIsolation, getSubjects);

// Get single subject
router.get('/:id', protect, enforceBranchIsolation, getSubject);

// Create subject - admin/manager only
router.post('/', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, createSubject);

// Update subject - admin/manager only
router.put('/:id', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, updateSubject);

// Delete subject - admin/manager only
router.delete('/:id', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, deleteSubject);

module.exports = router;
