const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass
} = require('../controllers/classController');

const router = express.Router();

// Get all classes
router.get('/', protect, authorize('admin', 'teacher', 'manager', 'founder'), enforceBranchIsolation, getClasses);

// Get single class
router.get('/:id', protect, authorize('admin', 'teacher', 'manager', 'founder'), enforceBranchIsolation, getClass);

// Create class
router.post('/', 
  protect, 
  authorize('admin', 'teacher', 'manager', 'founder'),
  enforceBranchIsolation,
  body('classScheduleId').optional().isMongoId(),
  body('date').isISO8601(),
  body('startTime').notEmpty(),
  body('endTime').notEmpty(),
  body('teacherId').isMongoId(),
  body('subjectId').isMongoId(),
  body('roomNumber').notEmpty(),
  createClass
);

// Update class
router.put('/:id', 
  protect, 
  authorize('admin', 'teacher', 'manager', 'founder'),
  enforceBranchIsolation,
  body('classScheduleId').optional().isMongoId(),
  body('date').optional().isISO8601(),
  body('startTime').optional().notEmpty(),
  body('endTime').optional().notEmpty(),
  body('teacherId').optional().isMongoId(),
  body('subjectId').optional().isMongoId(),
  body('roomNumber').optional().notEmpty(),
  updateClass
);

// Delete class
router.delete('/:id', protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, deleteClass);

module.exports = router;