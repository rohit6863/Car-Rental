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
}

module.exports = new AdminUsersController();
