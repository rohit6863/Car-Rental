'use strict';
const brandsService = require('../services/brands.service');

class BrandsController {
  async getAll(req, res, next) {
    try {
      const brands = await brandsService.getAll();
      res.json(brands);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const brand = await brandsService.getById(req.params.id);
      res.json(brand);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BrandsController();
