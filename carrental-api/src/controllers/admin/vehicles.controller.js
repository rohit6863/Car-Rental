'use strict';
const vehiclesService = require('../../services/vehicles.service');

class AdminVehiclesController {
  async getAll(req, res, next) {
    try {
      const vehicles = await vehiclesService.adminGetAll();
      res.json(vehicles);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const filenames = {};
      if (req.files) {
        if (req.files.img1 && req.files.img1[0]) filenames.vimage1 = req.files.img1[0].filename;
        if (req.files.img2 && req.files.img2[0]) filenames.vimage2 = req.files.img2[0].filename;
        if (req.files.img3 && req.files.img3[0]) filenames.vimage3 = req.files.img3[0].filename;
        if (req.files.img4 && req.files.img4[0]) filenames.vimage4 = req.files.img4[0].filename;
        if (req.files.img5 && req.files.img5[0]) filenames.vimage5 = req.files.img5[0].filename;
      }

      const result = await vehiclesService.adminCreate(req.body, filenames);
      res.status(201).json({ success: true, id: result.id, message: 'Vehicle posted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const result = await vehiclesService.adminUpdate(req.params.id, req.body);
      res.json({ success: true, message: 'Data updated successfully' });
    } catch (err) {
      next(err);
    }
  }

  async updateImage(req, res, next) {
    try {
      if (!req.file) {
        return res.status(422).json({ error: 'Please choose an image file to upload' });
      }
      await vehiclesService.adminUpdateImage(req.params.id, req.params.num, req.file.filename);
      res.json({ success: true, message: 'Image updated successfully', filename: req.file.filename });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const result = await vehiclesService.adminUpdateStatus(req.params.id, req.body.status);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updateTelematics(req, res, next) {
    try {
      const result = await vehiclesService.adminUpdateTelematics(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await vehiclesService.adminDelete(req.params.id);
      res.json({ success: true, message: 'Vehicle records deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminVehiclesController();
