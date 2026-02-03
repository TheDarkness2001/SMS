const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadPhoto,
  updateNotificationSettings,
  registerPushToken
} = require('../controllers/studentController');
const { protect, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, enforceBranchIsolation, getStudents)
  .post(protect, checkPermission('canManageStudents'), enforceBranchIsolation, upload.single('profileImage'), createStudent);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getStudent)
  .put(protect, checkPermission('canManageStudents'), enforceBranchIsolation, upload.single('profileImage'), updateStudent)
  .delete(protect, checkPermission('canManageStudents'), enforceBranchIsolation, deleteStudent);

router.put('/:id/photo', protect, enforceBranchIsolation, upload.single('profileImage'), uploadPhoto);
router.patch('/:id/notification-settings', protect, enforceBranchIsolation, updateNotificationSettings);
router.post('/:id/push-token', protect, enforceBranchIsolation, registerPushToken);

module.exports = router;
