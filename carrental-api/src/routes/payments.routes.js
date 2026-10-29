'use strict';
const express = require('express');
const paymentsController = require('../controllers/payments.controller');
const { requireAuth, requireUserOrAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  submitPaymentSchema,
  receiptBookingParamSchema,
} = require('../validators/payment.validator');

const router = express.Router();

router.post('/', requireAuth, validate({ body: submitPaymentSchema }), paymentsController.submitPayment);
router.get('/receipt/:bookingId', requireUserOrAdmin, validate({ params: receiptBookingParamSchema }), paymentsController.getReceipt);

module.exports = router;
