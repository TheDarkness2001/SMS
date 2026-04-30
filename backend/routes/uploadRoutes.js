const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, checkPermission } = require('../middleware/auth');
const { enforceBranchIsolation } = require('../middleware/branchIsolation');
const uploadController = require('../controllers/uploadController');

// Multer setup for document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedDocTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

  if (allowedDocTypes.includes(file.mimetype) || allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .docx and image files (jpg, png, webp) are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// Parse Word document
router.post('/parse-docx', protect, checkPermission('canManageStudents'), enforceBranchIsolation, upload.single('document'), uploadController.parseDocx);

// Parse image with OCR
router.post('/parse-ocr', protect, checkPermission('canManageStudents'), enforceBranchIsolation, upload.single('image'), uploadController.parseImageOCR);

// Bulk import words
router.post('/bulk-import/words', protect, checkPermission('canManageStudents'), enforceBranchIsolation, uploadController.bulkImportWords);

// Bulk import sentences
router.post('/bulk-import/sentences', protect, checkPermission('canManageStudents'), enforceBranchIsolation, uploadController.bulkImportSentences);

module.exports = router;
