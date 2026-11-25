'use strict';
const fleetOpsService = require('../../services/admin/fleetOps.service');

class AdminFleetOpsController {
  async getAnalytics(req, res, next) {
    try {
      const period = req.query.period === 'quarter' ? 'quarter' : 'year';
      const data = await fleetOpsService.getAnalytics(period);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getAlerts(req, res, next) {
    try {
      const data = await fleetOpsService.getAlerts();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async listMaintenance(req, res, next) {
    try {
      const rows = await fleetOpsService.listMaintenance();
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }

  async createMaintenance(req, res, next) {
    try {
      const result = await fleetOpsService.createMaintenance(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateMaintenance(req, res, next) {
    try {
      const result = await fleetOpsService.updateMaintenance(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteMaintenance(req, res, next) {
    try {
      const result = await fleetOpsService.deleteMaintenance(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPricing(req, res, next) {
    try {
      const data = await fleetOpsService.getPricingRules();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async updatePricing(req, res, next) {
    try {
      const data = await fleetOpsService.updatePricingRules(req.body);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async listNotes(req, res, next) {
    try {
      const rows = await fleetOpsService.listNotes();
      res.json(rows);
    } catch (err) {
      next(err);
    }
  }

  async createNote(req, res, next) {
    try {
      const result = await fleetOpsService.createNote(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateNote(req, res, next) {
    try {
      const result = await fleetOpsService.updateNote(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteNote(req, res, next) {
    try {
      const result = await fleetOpsService.deleteNote(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminFleetOpsController();
