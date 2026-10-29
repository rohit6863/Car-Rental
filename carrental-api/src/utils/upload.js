'use strict';
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { ValidationError } = require('./errors');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'vehicles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, randomName);
  },
});

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.mimetype)) {
    return cb(new ValidationError('Only JPG, PNG, and WEBP image files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter,
});

module.exports = { upload };
