'use strict';
const usersService = require('../services/users.service');
const authService = require('../services/auth.service');

class UsersController {
  async getProfile(req, res, next) {
    try {
      const profile = await usersService.getProfile(req.user.email);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const result = await usersService.updateProfile(req.user.email, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async updatePassword(req, res, next) {
    try {
      const result = await authService.userChangePassword(req.user.id, req.user.email, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async submitKyc(req, res, next) {
    try {
      const result = await usersService.submitKyc(req.user.email, {
        drivingLicenseNo: req.body.drivingLicenseNo,
        documentFilename: req.file ? req.file.filename : null,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getKycDocument(req, res, next) {
    try {
      const filePath = await usersService.getCustomerKycDocumentPath(req.user.email);
      res.setHeader('Cache-Control', 'private, no-store');
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsersController();
