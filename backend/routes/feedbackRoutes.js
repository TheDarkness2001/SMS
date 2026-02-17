const express = require('express');
const router = express.Router();
const {
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackByStudent,
  addParentComment,
  getTodayClasses,
  getFeedbackDebug
} = require('../controllers/feedbackController');
const { protect, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const { 
  restrictToOwnData, 
  validateFeedbackOwnership,
  forceTeacherIdInBody 
} = require('../middleware/teacherSecurity');

// GET all feedback - teachers see only THEIR feedback
router.route('/')
  .get(protect, enforceBranchIsolation, restrictToOwnData, getFeedback)
  .post(protect, enforceBranchIsolation, forceTeacherIdInBody, checkPermission('canManageFeedback'), createFeedback);

// Debug endpoint to check all feedback
router.get('/debug/all', protect, getFeedbackDebug);

// Teachers see only THEIR classes
router.get('/today-classes', protect, enforceBranchIsolation, restrictToOwnData, getTodayClasses);

// View feedback by student (teachers can only see feedback THEY created)
router.get('/student/:studentId', protect, enforceBranchIsolation, restrictToOwnData, getFeedbackByStudent);

// Update/delete feedback - teachers can only modify THEIR OWN feedback
router.route('/:id')
  .put(protect, enforceBranchIsolation, validateFeedbackOwnership, checkPermission('canManageFeedback'), updateFeedback)
  .delete(protect, enforceBranchIsolation, validateFeedbackOwnership, checkPermission('canManageFeedback'), deleteFeedback);

// Parents can add comments to any feedback
router.put('/:id/parent-comment', protect, enforceBranchIsolation, addParentComment);

module.exports = router;