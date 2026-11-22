'use strict';
const express = require('express');
const adminPaymentsController = require('../../controllers/admin/payments.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { paymentIdParamSchema } = require('../../validators/payment.validator');

const router = express.Router();

router.use(requireAdmin);

router.get('/', adminPaymentsController.getAll);
router.patch('/:id/confirm', validate({ params: paymentIdParamSchema }), adminPaymentsController.confirm);
router.patch('/:id/reject', validate({ params: paymentIdParamSchema }), adminPaymentsController.reject);

// Online payment reconciliation
router.post('/reconcile/:paymentId', validate({ params: paymentIdParamSchema }), adminPaymentsController.reconcile);
router.post('/:id/reconcile', validate({ params: paymentIdParamSchema }), adminPaymentsController.reconcile);

module.exports = router;