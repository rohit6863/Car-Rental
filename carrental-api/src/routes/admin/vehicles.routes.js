'use strict';
const express = require('express');
const adminVehiclesController = require('../../controllers/admin/vehicles.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { upload } = require('../../utils/upload');
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

router.get('/', adminVehiclesController.getAll);
router.post('/', vehicleImagesUpload, validate({ body: vehicleFormSchema }), adminVehiclesController.create);
router.put('/:id', validate({ params: vehicleIdParamSchema, body: vehicleFormSchema }), adminVehiclesController.update);
router.put('/:id/image/:num', upload.single('img'), validate({ params: vehicleImageNumParamSchema }), adminVehiclesController.updateImage);
router.delete('/:id', validate({ params: vehicleIdParamSchema }), adminVehiclesController.delete);

module.exports = router;
