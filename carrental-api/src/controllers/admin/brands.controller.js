'use strict';
const brandsService = require('../../services/brands.service');

class AdminBrandsController {
  async getAll(req, res, next) {
    try {
      const brands = await brandsService.getAll();
      res.json(brands);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const result = await brandsService.create(req.body.brand);
      res.status(201).json({ success: true, message: 'Brand Created successfully', ...result });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await brandsService.update(req.params.id, req.body.brand);
      res.json({ success: true, message: 'Brand updated successfully', ...result });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await brandsService.delete(req.params.id);
      res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminBrandsController();
