'use strict';
const pagesService = require('../../services/pages.service');

class AdminPagesController {
  async getAll(req, res, next) {
    try {
      const pages = await pagesService.adminGetAll();
      res.json(pages);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await pagesService.adminUpdate(req.params.type, req.body.detail);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminPagesController();
