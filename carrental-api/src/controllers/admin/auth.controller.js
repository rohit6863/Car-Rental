'use strict';
const authService = require('../../services/auth.service');
const { adminAccessCookieOptions, adminRefreshCookieOptions, clearAdminCookies } = require('../../utils/jwt');

class AdminAuthController {
  async login(req, res, next) {
    try {
      const { admin, accessToken, refreshToken, mustChangePassword } = await authService.adminLogin(req.body);

      res.cookie('admin_access_token', accessToken, adminAccessCookieOptions());
      res.cookie('admin_refresh_token', refreshToken, adminRefreshCookieOptions());

      res.json({
        admin,
        mustChangePassword,
        csrfToken: res.locals.csrfToken ? res.locals.csrfToken() : null,
        message: 'Admin login successful',
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(_req, res) {
    clearAdminCookies(res);
    res.json({ message: 'Admin logged out successfully' });
  }

  async changePassword(req, res, next) {
    try {
      const result = await authService.adminChangePassword(req.admin.id, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      res.json({ admin: req.admin });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminAuthController();
