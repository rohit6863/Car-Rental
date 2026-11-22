'use strict';
const express = require('express');
const paymentsController = require('../controllers/payments.controller');
const { requireAuth, requireUserOrAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { paymentOrderLimiter, paymentVerifyLimiter } = require('../middleware/rateLimiter');
const {
  submitPaymentSchema,
  createOrderSchema,
  verifyPaymentSchema,
  receiptBookingParamSchema,
} = require('../validators/payment.validator');

const router = express.Router();

// Public configuration for payment options
router.get('/config', paymentsController.getConfig);

// Online payment lifecycle
router.post(
  '/order',
  requireAuth,
  paymentOrderLimiter,
  validate({ body: createOrderSchema }),
  paymentsController.createOrder
);

// Mock simulation helper (dev/test only, strictly not reachable in production)
if (process.env.NODE_ENV !== 'production') {
  router.post('/mock/simulate', requireAuth, paymentsController.mockSimulate);
}

router.post(
  '/verify',
  requireAuth,
  paymentVerifyLimiter,
  validate({ body: verifyPaymentSchema }),
  paymentsController.verifyPayment
);

router.post('/webhook', paymentsController.handleWebhook);

router.get(
  '/status/:bookingId',
  requireUserOrAdmin,
  validate({ params: receiptBookingParamSchema }),
  paymentsController.getStatus
);

router.get(
  '/receipt/:bookingId',
  requireUserOrAdmin,
  validate({ params: receiptBookingParamSchema }),
  paymentsController.getReceipt
);

// Legacy manual payment submission
router.post(
  '/',
  requireAuth,
  validate({ body: submitPaymentSchema }),
  paymentsController.submitPayment
);

module.exports = router;