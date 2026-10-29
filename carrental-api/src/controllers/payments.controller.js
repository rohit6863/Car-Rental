'use strict';
const paymentsService = require('../services/payments.service');

class PaymentsController {
  async submitPayment(req, res, next) {
    try {
      const result = await paymentsService.submitPayment({
        booking_id: req.body.booking_id,
        userEmail: req.user.email,
        payment_method: req.body.payment_method,
        transaction_id: req.body.transaction_id,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getReceipt(req, res, next) {
    try {
      // req.user is populated by requireAuth or req.admin
      const currentUser = req.user || req.admin;
      const receipt = await paymentsService.getReceipt(req.params.bookingId, currentUser);
      res.json(receipt);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentsController();
