'use strict';
const newsletterService = require('../services/newsletter.service');

class NewsletterController {
  async subscribe(req, res, next) {
    try {
      const result = await newsletterService.subscribe(req.body.subscriberemail);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NewsletterController();
