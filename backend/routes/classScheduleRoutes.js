const express = require('express');
const router = express.Router();
const { 
  getClassSchedules, 
  getClassSchedule, 
  createClassSchedule, 
  updateClassSchedule, 
  deleteClassSchedule 
} = require('../controllers/classScheduleController');
const { protect } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

router.route('/')
  .get(protect, enforceBranchIsolation, getClassSchedules)
  .post(protect, enforceBranchIsolation, createClassSchedule);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getClassSchedule)
  .put(protect, enforceBranchIsolation, updateClassSchedule)
  .delete(protect, enforceBranchIsolation, deleteClassSchedule);

module.exports = router;