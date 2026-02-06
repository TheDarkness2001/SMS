const multer = require('multer');
const path = require('path');
const fs = require('fs');
const imagekit = require('../config/imagekit');

// Use memory storage for ImageKit, disk storage as fallback
const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Choose storage based on ImageKit configuration
const storage = process.env.IMAGEKIT_PRIVATE_KEY ? memoryStorage : diskStorage;

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  }
};

// Upload configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Middleware to upload to ImageKit after multer processes the file
const uploadToImageKit = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // If ImageKit is not configured, file is already saved to disk by multer
  if (!process.env.IMAGEKIT_PRIVATE_KEY) {
    console.log('[ImageKit] Not configured, using disk storage. File saved to:', req.file.path);
    return next();
  }

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);

    // Convert buffer to base64 for ImageKit
    const fileBase64 = req.file.buffer.toString('base64');

    // Upload to ImageKit
    const result = await imagekit.upload({
      file: fileBase64, // Base64 encoded file
      fileName: fileName,
      folder: '/uploads' // Optional: organize files in folders
    });

    // Replace file path with ImageKit URL
    req.file.path = result.url;
    req.file.filename = result.name;
    req.file.imagekitFileId = result.fileId; // Store for potential deletion

    next();
  } catch (error) {
    console.error('ImageKit upload error:', error);
    next(error);
  }
};

module.exports = { upload, uploadToImageKit };
