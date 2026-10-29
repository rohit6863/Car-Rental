'use strict';
const newsletterService = require('../../services/newsletter.service');

class AdminSubscribersController {
  async getAll(req, res, next) {
    try {
      const subscribers = await newsletterService.adminGetSubscribers();
      res.json(subscribers);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminSubscribersController();
