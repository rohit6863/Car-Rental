'use strict';
const bookingsService = require('../../services/bookings.service');

class AdminBookingsController {
  async getAll(req, res, next) {
    try {
      const bookings = await bookingsService.adminGetAll();
      res.json(bookings);
    } catch (err) {
      next(err);
    }
  }

  async confirm(req, res, next) {
    try {
      const result = await bookingsService.adminConfirm(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req, res, next) {
    try {
      const result = await bookingsService.adminCancel(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminBookingsController();
