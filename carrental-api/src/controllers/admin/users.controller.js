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
}

module.exports = new AdminUsersController();
