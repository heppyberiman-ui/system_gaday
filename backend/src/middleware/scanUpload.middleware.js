const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads/scan directory exists
const scanUploadDir = path.join(__dirname, '../uploads/scan');
if (!fs.existsSync(scanUploadDir)) {
  fs.mkdirSync(scanUploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, scanUploadDir);
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
