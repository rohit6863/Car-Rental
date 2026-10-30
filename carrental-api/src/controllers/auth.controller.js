'use strict';
const authService = require('../services/auth.service');
const { accessCookieOptions, refreshCookieOptions, clearCookies } = require('../utils/jwt');

class AuthController {
  async register(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body, req.ip);

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
      const { user, accessToken, refreshToken } = await authService.login(req.body, req.ip);

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

  async logout(req, res, next) {
    try {
      if (req.cookies && req.cookies.refresh_token) {
        await authService.revokeRefreshToken(req.cookies.refresh_token);
      }
      clearCookies(res);
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
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
      const result = await authService.forgotPassword(req.body.email, req.ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body, req.ip);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const token = req.cookies && req.cookies.refresh_token;
      if (!token) {
        return res.status(401).json({ error: 'Refresh token missing' });
      }
      const { accessToken, refreshToken } = await authService.refreshToken(token, req.ip);
      res.cookie('access_token', accessToken, accessCookieOptions());
      res.cookie('refresh_token', refreshToken, refreshCookieOptions());
      res.json({ success: true });
    } catch (err) {
      clearCookies(res);
      next(err);
    }
  }

  async getCsrf(_req, res) {
    const token = res.locals.csrfToken ? res.locals.csrfToken() : '';
    res.json({ csrfToken: token });
  }
}

module.exports = new AuthController();
