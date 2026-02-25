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
  if (!process.env.IMAGEKIT_PRIVATE_KEY || !imagekit) {
    console.log('[ImageKit] Not configured or SDK not initialized, using disk storage. File saved to:', req.file.path);
    return next();
  }

  try {
    console.log('[ImageKit] Starting upload...');
    console.log('[ImageKit] IMAGEKIT_PRIVATE_KEY exists:', !!process.env.IMAGEKIT_PRIVATE_KEY);
    console.log('[ImageKit] File buffer size:', req.file.buffer.length);
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);

    // Convert buffer to base64 for ImageKit
    const fileBase64 = req.file.buffer.toString('base64');
    console.log('[ImageKit] File converted to base64, length:', fileBase64.length);

    // Upload to ImageKit using v7 SDK
    console.log('[ImageKit] Uploading to ImageKit...');
    
    // ImageKit v7 uses upload method on the instance
    const uploadOptions = {
      file: fileBase64,
      fileName: fileName,
      folder: '/uploads',
      useUniqueFileName: false
    };
    
    console.log('[ImageKit] Calling upload with options:', { fileName, folder: '/uploads' });
    const result = await imagekit.upload(uploadOptions);

    console.log('[ImageKit] Upload successful!', result.url);
    
    // Replace file info with ImageKit URL
    req.file.path = result.url;  // Full ImageKit URL
    req.file.filename = result.url;  // Also set filename to full URL for consistency
    req.file.imagekitFileId = result.fileId; // Store for potential deletion
    req.file.isImageKit = true;  // Flag to indicate ImageKit upload

    next();
  } catch (error) {
    console.error('[ImageKit] ❌ Upload error details:', error.message);
    console.error('[ImageKit] ❌ Full error:', error);
    console.error('[ImageKit] ❌ Error stack:', error.stack);
    
    // Fallback to disk storage if ImageKit fails
    console.log('[ImageKit] Falling back to disk storage...');
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = req.file.fieldname + '-' + uniqueSuffix + path.extname(req.file.originalname);
    const filePath = path.join(uploadDir, fileName);
    
    fs.writeFileSync(filePath, req.file.buffer);
    req.file.path = filePath;
    req.file.filename = fileName;
    console.log('[ImageKit] Fallback successful, file saved to:', filePath);
    
    next();
  }
};

module.exports = { upload, uploadToImageKit };
