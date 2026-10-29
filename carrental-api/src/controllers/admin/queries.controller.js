'use strict';
const contactService = require('../../services/contact.service');

class AdminQueriesController {
  async getAll(req, res, next) {
    try {
      const queries = await contactService.adminGetQueries();
      res.json(queries);
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const result = await contactService.adminMarkQueryRead(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminQueriesController();
