'use strict';
const express = require('express');
const adminBookingsController = require('../../controllers/admin/bookings.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { bookingIdParamSchema, returnBookingSchema } = require('../../validators/booking.validator');

const router = express.Router();

router.use(requireAdmin);

router.get('/', adminBookingsController.getAll);
router.patch('/:id/confirm', validate({ params: bookingIdParamSchema }), adminBookingsController.confirm);
router.patch('/:id/cancel', validate({ params: bookingIdParamSchema }), adminBookingsController.cancel);
router.patch('/:id/return', validate({ params: bookingIdParamSchema, body: returnBookingSchema }), adminBookingsController.returnBooking);

module.exports = router;
