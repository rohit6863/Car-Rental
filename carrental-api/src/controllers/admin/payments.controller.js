'use strict';
const paymentsService = require('../../services/payments.service');

class AdminPaymentsController {
  async getAll(req, res, next) {
    try {
      const payments = await paymentsService.adminGetAll();
      res.json(payments);
    } catch (err) {
      next(err);
    }
  }

  async confirm(req, res, next) {
    try {
      const result = await paymentsService.adminConfirm(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async reject(req, res, next) {
    try {
      const result = await paymentsService.adminReject(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminPaymentsController();
