'use strict';
const paymentsService = require('../services/payments.service');

class PaymentsController {
  async getConfig(req, res, next) {
    try {
      const config = paymentsService.getPublicConfig();
      res.json(config);
    } catch (err) {
      next(err);
    }
  }

  async mockSimulate(req, res, next) {
    try {
      const { orderId, action, method, reason } = req.body;
      const result = await paymentsService.mockSimulate({ orderId, action, method, reason });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createOrder(req, res, next) {
    try {
      const bookingId = req.body.bookingId || req.body.booking_id;
      const order = await paymentsService.createOrder({
        bookingId,
        userEmail: req.user.email,
      });
      res.json(order);
    } catch (err) {
      next(err);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const result = await paymentsService.verifyPayment({
        bookingId: req.body.bookingId,
        orderId: req.body.orderId,
        paymentId: req.body.paymentId,
        signature: req.body.signature,
        userEmail: req.user.email,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req, res, next) {
    try {
      const result = await paymentsService.handleWebhook({
        rawBody: req.body,
        headers: req.headers,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getStatus(req, res, next) {
    try {
      const currentUser = req.user || req.admin;
      const status = await paymentsService.getStatus(req.params.bookingId, currentUser);
      res.json(status);
    } catch (err) {
      next(err);
    }
  }

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
      const currentUser = req.user || req.admin;
      const receipt = await paymentsService.getReceipt(req.params.bookingId, currentUser);
      res.json(receipt);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PaymentsController();