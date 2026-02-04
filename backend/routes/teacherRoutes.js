const express = require('express');
const router = express.Router();
const {
  getTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  uploadPhoto,
  updatePermissions
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const { upload, uploadToImageKit } = require('../middleware/imagekitUpload');

router.route('/')
  .get(protect, enforceBranchIsolation, getTeachers)
  .post(protect, authorize('admin', 'manager', 'founder'), enforceBranchIsolation, createTeacher);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getTeacher)
  .put(protect, authorize('admin', 'manager'), enforceBranchIsolation, updateTeacher)
  .delete(protect, authorize('admin', 'manager'), enforceBranchIsolation, deleteTeacher);

router.put('/:id/photo', protect, enforceBranchIsolation, upload.single('profileImage'), uploadToImageKit, uploadPhoto);
router.put('/:id/permissions', protect, authorize('admin', 'manager'), enforceBranchIsolation, updatePermissions);

module.exports = router;
