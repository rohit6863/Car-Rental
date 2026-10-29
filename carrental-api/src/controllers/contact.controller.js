'use strict';
const contactService = require('../services/contact.service');

class ContactController {
  async submitQuery(req, res, next) {
    try {
      const result = await contactService.submitQuery(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getContactInfo(req, res, next) {
    try {
      const info = await contactService.getContactInfo();
      res.json(info);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ContactController();
