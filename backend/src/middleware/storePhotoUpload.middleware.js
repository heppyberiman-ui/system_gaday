const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Ensure uploads directory exists safely (with fallback for Vercel read-only filesystem)
const getUploadDir = (subfolder = '') => {
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

const uploadDir = getUploadDir('');

// Storage Configuration for Store Photo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDir(''));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'store-photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filter file types (JPEG, PNG, JPG, WEBP)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Jenis berkas tidak valid. Hanya gambar JPG, PNG, JPEG, dan WEBP yang diperbolehkan.');
    error.statusCode = 400;
    cb(error, false);
  }
};

const storePhotoUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB limit
  },
  fileFilter: fileFilter
});

module.exports = storePhotoUpload;
