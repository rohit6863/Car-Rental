'use strict';
const authService = require('../services/auth.service');
const { accessCookieOptions, refreshCookieOptions, clearCookies } = require('../utils/jwt');

class AuthController {
  async register(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);

      res.cookie('access_token', accessToken, accessCookieOptions());
      res.cookie('refresh_token', refreshToken, refreshCookieOptions());

      res.status(201).json({
        user,
        csrfToken: res.locals.csrfToken ? res.locals.csrfToken() : null,
        message: 'Registration successful. Now you can login',
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body);

      res.cookie('access_token', accessToken, accessCookieOptions());
      res.cookie('refresh_token', refreshToken, refreshCookieOptions());

      res.json({
        user,
        csrfToken: res.locals.csrfToken ? res.locals.csrfToken() : null,
        message: 'Login successful',
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(_req, res) {
    clearCookies(res);
    res.json({ message: 'Logged out successfully' });
  }

  async me(req, res, next) {
    try {
      // req.user is set by requireAuth
      res.json({ user: req.user });
    } catch (err) {
      next(err);
    }
  }

  async checkEmail(req, res, next) {
    try {
      const { email } = req.query;
      const result = await authService.checkEmail(email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body.email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const token = req.cookies.refresh_token;
      if (!token) {
        return res.status(401).json({ error: 'Refresh token missing' });
      }
      const { accessToken } = await authService.refreshToken(token);
      res.cookie('access_token', accessToken, accessCookieOptions());
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async getCsrf(_req, res) {
    const token = res.locals.csrfToken ? res.locals.csrfToken() : '';
    res.json({ csrfToken: token });
  }
}

module.exports = new AuthController();
