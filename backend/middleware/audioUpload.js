const multer = require('multer');
const path = require('path');
const fs = require('fs');
const imagekit = require('../config/imagekit');

const audioFilter = (req, file, cb) => {
  const allowedTypes = /mp3|mpeg|wav|ogg|m4a|aac|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a, aac, webm)'));
  }
};

const memoryStorage = multer.memoryStorage();
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Production: memory + ImageKit. Local dev without ImageKit: disk storage.
const storage = process.env.IMAGEKIT_PRIVATE_KEY ? memoryStorage : diskStorage;

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: audioFilter
});

const uploadAudioToImageKit = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  if (!process.env.IMAGEKIT_PRIVATE_KEY || !imagekit) {
    if (!req.file.filename && req.file.path) {
      req.file.filename = path.basename(req.file.path);
    }
    console.log('[Listening Audio] ImageKit not configured, saved to disk:', req.file.filename || req.file.path);
    return next();
  }

  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = 'audio-' + uniqueSuffix + path.extname(req.file.originalname);

    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName,
      folder: '/listening',
      useUniqueFileName: false,
      contentType: req.file.mimetype || 'audio/mpeg'
    });

    req.file.filename = result.url;
    req.file.imagekitFileId = result.fileId;
    console.log('[Listening Audio] Uploaded to ImageKit:', result.url);
    next();
  } catch (error) {
    console.error('[Listening Audio] ImageKit upload failed, falling back to disk:', error.message);

    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = 'audio-' + uniqueSuffix + path.extname(req.file.originalname);
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);
    req.file.filename = fileName;
    req.file.path = filePath;
    next();
  }
};

module.exports = { upload, uploadAudioToImageKit };
