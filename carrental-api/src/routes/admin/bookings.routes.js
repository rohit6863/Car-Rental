'use strict';
const express = require('express');
const adminBookingsController = require('../../controllers/admin/bookings.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { bookingIdParamSchema } = require('../../validators/booking.validator');

const router = express.Router();

router.use(requireAdmin);

router.get('/', adminBookingsController.getAll);
router.patch('/:id/confirm', validate({ params: bookingIdParamSchema }), adminBookingsController.confirm);
router.patch('/:id/cancel', validate({ params: bookingIdParamSchema }), adminBookingsController.cancel);

module.exports = router;
