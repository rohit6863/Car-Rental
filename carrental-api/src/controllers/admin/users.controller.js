'use strict';
const usersService = require('../../services/users.service');

class AdminUsersController {
  async getAll(req, res, next) {
    try {
      const users = await usersService.adminGetAllUsers();
      res.json(users);
    } catch (err) {
      next(err);
    }
  }

  async updateKyc(req, res, next) {
    try {
      const result = await usersService.adminUpdateKyc(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getKycDocument(req, res, next) {
    try {
      const filePath = await usersService.adminGetKycDocumentPath(req.params.id);
      res.setHeader('Cache-Control', 'private, no-store');
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminUsersController();
