'use strict';
const express = require('express');
const vehiclesController = require('../controllers/vehicles.controller');
const { validate } = require('../middleware/validate');
const {
  vehicleSearchSchema,
  vehicleIdParamSchema,
} = require('../validators/vehicle.validator');
const { checkAvailabilitySchema } = require('../validators/booking.validator');

const router = express.Router();

router.get('/', vehiclesController.getAll);
router.get('/recent', vehiclesController.getRecent);
router.get('/search', validate({ query: vehicleSearchSchema }), vehiclesController.search);
router.get('/:id', validate({ params: vehicleIdParamSchema }), vehiclesController.getById);
router.get('/:id/similar', validate({ params: vehicleIdParamSchema }), vehiclesController.getSimilar);
router.get('/:id/booked-dates', validate({ params: vehicleIdParamSchema }), vehiclesController.getBookedDates);
router.post('/check-availability', validate({ body: checkAvailabilitySchema }), vehiclesController.checkAvailability);

module.exports = router;
