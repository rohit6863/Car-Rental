'use strict';
const bookingsService = require('../services/bookings.service');

class BookingsController {
  async create(req, res, next) {
    try {
      const result = await bookingsService.createBooking({
        userEmail: req.user.email,
        vehicle_id: req.body.vehicle_id,
        fromdate: req.body.fromdate,
        todate: req.body.todate,
        message: req.body.message,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMyBookings(req, res, next) {
    try {
      const bookings = await bookingsService.getUserBookings(req.user.email);
      res.json(bookings);
    } catch (err) {
      next(err);
    }
  }

  async cancelMyBooking(req, res, next) {
    try {
      const result = await bookingsService.userCancel(req.params.id, req.user.email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BookingsController();
