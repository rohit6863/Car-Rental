'use strict';
const contactService = require('../../services/contact.service');

class AdminContactInfoController {
  async get(req, res, next) {
    try {
      const info = await contactService.getContactInfo();
      res.json(info);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await contactService.adminUpdateContactInfo(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminContactInfoController();
