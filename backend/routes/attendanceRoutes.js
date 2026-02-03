const express = require('express');
const router = express.Router();
const {
  getAttendance,
  getSingleAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance
} = require('../controllers/attendanceController');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');

// Multer setup for multiple files
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadMultiple = multer({ storage });

// Standard attendance routes
router.route('/')
  .get(protect, enforceBranchIsolation, getAttendance)
  .post(protect, checkPermission('canManageAttendance'), enforceBranchIsolation, uploadMultiple.fields([
    { name: 'checkInPhoto', maxCount: 1 },
    { name: 'checkOutPhoto', maxCount: 1 }
  ]), createAttendance);

router.route('/:id')
  .get(protect, enforceBranchIsolation, getSingleAttendance)
  .put(protect, checkPermission('canManageAttendance'), enforceBranchIsolation, uploadMultiple.fields([
    { name: 'checkOutPhoto', maxCount: 1 }
  ]), updateAttendance)
  .delete(protect, authorize('admin'), enforceBranchIsolation, deleteAttendance);

module.exports = router;
