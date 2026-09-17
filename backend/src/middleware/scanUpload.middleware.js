const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Ensure uploads/scan directory exists safely (with fallback for Vercel read-only filesystem)
const getUploadDir = (subfolder = 'scan') => {
  const localDir = path.join(__dirname, '../uploads', subfolder);
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch (err) {
    const tmpDir = path.join(os.tmpdir(), 'uploads', subfolder);
    if (!fs.existsSync(tmpDir)) {
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (e) {
        // ignore fallback errors
      }
    }
    return tmpDir;
  }
};

const scanUploadDir = getUploadDir('scan');

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir('scan'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'scan-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter file types (Allow images only)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, and JPG images are allowed.');
    error.statusCode = 400;
    cb(error, false);
  }
};

// Initialize multer upload instance
const scanUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  },
  fileFilter: fileFilter
});

module.exports = scanUpload;
