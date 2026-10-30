'use strict';
const authService = require('../../services/auth.service');
const { adminAccessCookieOptions, adminRefreshCookieOptions, clearAdminCookies } = require('../../utils/jwt');

class AdminAuthController {
  async login(req, res, next) {
    try {
      const { admin, accessToken, refreshToken, mustChangePassword } = await authService.adminLogin(req.body, req.ip);

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

  async logout(req, res, next) {
    try {
      if (req.cookies && req.cookies.admin_refresh_token) {
        await authService.revokeRefreshToken(req.cookies.admin_refresh_token);
      }
      clearAdminCookies(res);
      res.json({ message: 'Admin logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req, res, next) {
    try {
      const result = await authService.adminChangePassword(req.admin.id, req.body, req.ip);
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

  async refresh(req, res, next) {
    try {
      const token = req.cookies && req.cookies.admin_refresh_token;
      if (!token) {
        return res.status(401).json({ error: 'Refresh token missing' });
      }
      const { accessToken, refreshToken } = await authService.refreshToken(token, req.ip);
      res.cookie('admin_access_token', accessToken, adminAccessCookieOptions());
      res.cookie('admin_refresh_token', refreshToken, adminRefreshCookieOptions());
      res.json({ success: true });
    } catch (err) {
      clearAdminCookies(res);
      next(err);
    }
  }
}

module.exports = new AdminAuthController();
