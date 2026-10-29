'use strict';
const pagesService = require('../services/pages.service');

class PagesController {
  async getPage(req, res, next) {
    try {
      const page = await pagesService.getPage(req.params.type);
      res.json(page);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PagesController();
