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
const { upload, uploadToImageKit } = require('../middleware/imagekitUpload');

router.route('/')
  .get(protect, enforceBranchIsolation, getStudents)
  .post(protect, checkPermission('canManageStudents'), enforceBranchIsolation, upload.single('profileImage'), uploadToImageKit, createStudent);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getStudent)
  .put(protect, checkPermission('canManageStudents'), enforceBranchIsolation, upload.single('profileImage'), uploadToImageKit, updateStudent)
  .delete(protect, checkPermission('canManageStudents'), enforceBranchIsolation, deleteStudent);

router.put('/:id/photo', protect, enforceBranchIsolation, upload.single('profileImage'), uploadToImageKit, uploadPhoto);
router.patch('/:id/notification-settings', protect, enforceBranchIsolation, updateNotificationSettings);
router.post('/:id/push-token', protect, enforceBranchIsolation, registerPushToken);

module.exports = router;
