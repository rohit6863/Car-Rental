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

const kycUploadDir = path.join(__dirname, '..', '..', 'uploads', 'kyc');
if (!fs.existsSync(kycUploadDir)) {
  fs.mkdirSync(kycUploadDir, { recursive: true });
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

const kycStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, kycUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `kyc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, randomName);
  },
});

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const FIELD_LABELS = {
  img1: 'Image 1',
  img2: 'Image 2',
  img3: 'Image 3',
  img4: 'Image 4',
  img5: 'Image 5',
  img: 'Image',
  kycDocument: 'Driving License Photo',
};

function getFieldLabel(fieldname) {
  return FIELD_LABELS[fieldname] || fieldname || 'Image';
}

function cleanupUploadedFiles(req) {
  const filesToDelete = [];
  if (req.file) filesToDelete.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToDelete.push(...req.files);
    } else {
      Object.values(req.files).forEach((fArr) => {
        if (Array.isArray(fArr)) filesToDelete.push(...fArr);
      });
    }
  }

  for (const file of filesToDelete) {
    if (file && file.path) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {}
    }
  }
}

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const label = getFieldLabel(file.fieldname);
  if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.mimetype)) {
    return cb(new ValidationError(`${label} is not a valid JPEG, PNG, or WEBP file`, [
      { field: file.fieldname, message: `${label} is not a valid JPEG, PNG, or WEBP file` },
    ]));
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

const kycUpload = multer({
  storage: kycStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter,
});

/**
 * Validates actual binary signatures (magic bytes) to prevent extension/MIME spoofing.
 */
function isAllowedImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) return true;
  // WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;

  return false;
}

/**
 * Express middleware to inspect uploaded files on disk for valid magic bytes.
 * Deletes invalid/spoofed files immediately and removes all uploaded files on error.
 */
function verifyUploadMagicBytes(req, _res, next) {
  const filesToCheck = [];
  if (req.file) filesToCheck.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      filesToCheck.push(...req.files);
    } else {
      Object.values(req.files).forEach((fArr) => {
        if (Array.isArray(fArr)) filesToCheck.push(...fArr);
      });
    }
  }

  for (const file of filesToCheck) {
    try {
      const buffer = Buffer.alloc(16);
      const fd = fs.openSync(file.path, 'r');
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);

      if (!isAllowedImageMagicBytes(buffer)) {
        cleanupUploadedFiles(req);
        const label = getFieldLabel(file.fieldname);
        return next(new ValidationError(`${label} is not a valid JPEG, PNG, or WEBP file (signature mismatch)`, [
          { field: file.fieldname, message: `${label} is not a valid JPEG, PNG, or WEBP file (signature mismatch)` },
        ]));
      }
    } catch {
      cleanupUploadedFiles(req);
      const label = getFieldLabel(file.fieldname);
      return next(new ValidationError(`${label} is not a valid JPEG, PNG, or WEBP file (signature mismatch)`, [
        { field: file.fieldname, message: `${label} is not a valid JPEG, PNG, or WEBP file (signature mismatch)` },
      ]));
    }
  }
  next();
}

module.exports = {
  upload,
  kycUpload,
  kycUploadDir,
  isAllowedImageMagicBytes,
  verifyUploadMagicBytes,
  cleanupUploadedFiles,
  getFieldLabel,
};
