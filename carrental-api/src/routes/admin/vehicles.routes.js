'use strict';
const express = require('express');
const adminVehiclesController = require('../../controllers/admin/vehicles.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { upload, verifyUploadMagicBytes, cleanupUploadedFiles } = require('../../utils/upload');
const { ValidationError } = require('../../utils/errors');
const {
  vehicleFormSchema,
  vehicleIdParamSchema,
  vehicleImageNumParamSchema,
} = require('../../validators/vehicle.validator');

const router = express.Router();

router.use(requireAdmin);

const vehicleImagesUpload = upload.fields([
  { name: 'img1', maxCount: 1 },
  { name: 'img2', maxCount: 1 },
  { name: 'img3', maxCount: 1 },
  { name: 'img4', maxCount: 1 },
  { name: 'img5', maxCount: 1 },
]);

function validateVehicleImages(req, _res, next) {
  const missing = [];
  if (!req.files || !req.files.img1 || !req.files.img1[0]) {
    missing.push({ field: 'img1', message: 'Image 1 is required' });
  }
  if (!req.files || !req.files.img2 || !req.files.img2[0]) {
    missing.push({ field: 'img2', message: 'Image 2 is required' });
  }

  if (missing.length > 0) {
    cleanupUploadedFiles(req);
    const msg = missing.map((m) => m.message).join('. ');
    return next(new ValidationError(msg, missing));
  }
  next();
}

router.get('/', adminVehiclesController.getAll);
router.post(
  '/',
  vehicleImagesUpload,
  verifyUploadMagicBytes,
  validateVehicleImages,
  validate({ body: vehicleFormSchema }),
  adminVehiclesController.create
);
router.put('/:id', validate({ params: vehicleIdParamSchema, body: vehicleFormSchema }), adminVehiclesController.update);
router.put('/:id/image/:num', upload.single('img'), verifyUploadMagicBytes, validate({ params: vehicleImageNumParamSchema }), adminVehiclesController.updateImage);
router.delete('/:id', validate({ params: vehicleIdParamSchema }), adminVehiclesController.delete);

module.exports = router;
