'use strict';
const express = require('express');
const bookingsController = require('../controllers/bookings.controller');
const vehiclesController = require('../controllers/vehicles.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  checkAvailabilitySchema,
  createBookingSchema,
  bookingIdParamSchema,
} = require('../validators/booking.validator');

const router = express.Router();

// Allow public availability check on /api/bookings/check-availability as well
router.post('/check-availability', validate({ body: checkAvailabilitySchema }), vehiclesController.checkAvailability);

router.use(requireAuth);

router.post('/', validate({ body: createBookingSchema }), bookingsController.create);
router.get('/my', bookingsController.getMyBookings);
router.post('/:id/cancel', validate({ params: bookingIdParamSchema }), bookingsController.cancelMyBooking);

module.exports = router;
