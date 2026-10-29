'use strict';
const adminStatsService = require('../../services/admin/stats.service');

class AdminStatsController {
  async getDashboardStats(req, res, next) {
    try {
      const stats = await adminStatsService.getDashboardStats();
      res.json(stats);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminStatsController();
