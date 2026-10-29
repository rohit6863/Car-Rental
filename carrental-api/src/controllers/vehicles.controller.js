'use strict';
const vehiclesService = require('../services/vehicles.service');

class VehiclesController {
  async getAll(req, res, next) {
    try {
      const vehicles = await vehiclesService.getAll();
      res.json(vehicles);
    } catch (err) {
      next(err);
    }
  }

  async getRecent(req, res, next) {
    try {
      const limit = parseInt(req.query.limit || '4', 10);
      const vehicles = await vehiclesService.getRecent(limit);
      res.json(vehicles);
    } catch (err) {
      next(err);
    }
  }

  async search(req, res, next) {
    try {
      const vehicles = await vehiclesService.search(req.query);
      res.json(vehicles);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const vehicle = await vehiclesService.getById(req.params.id);
      res.json(vehicle);
    } catch (err) {
      next(err);
    }
  }

  async getSimilar(req, res, next) {
    try {
      const vehicle = await vehiclesService.getById(req.params.id);
      const similar = await vehiclesService.getSimilar(vehicle.VehiclesBrand, vehicle.id);
      res.json(similar);
    } catch (err) {
      next(err);
    }
  }

  async getBookedDates(req, res, next) {
    try {
      const dates = await vehiclesService.getBookedDates(req.params.id);
      res.json({ success: true, booked_dates: dates });
    } catch (err) {
      next(err);
    }
  }

  async checkAvailability(req, res, next) {
    try {
      const { vehicle_id, from_date, to_date } = req.body;
      const result = await vehiclesService.checkAvailability(vehicle_id, from_date, to_date);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new VehiclesController();
