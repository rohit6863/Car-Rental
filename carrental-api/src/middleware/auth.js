'use strict';
const { verifyAccessToken } = require('../utils/jwt');
const { AuthError, ForbiddenError } = require('../utils/errors');

/**
 * requireAuth – verifies the access token from the httpOnly cookie.
 * Attaches req.user = { id, email, role, mustChangePassword }.
 */
function requireAuth(req, _res, next) {
  try {
    const token = req.cookies && req.cookies.access_token;
    if (!token) throw new AuthError('Authentication required');
    const payload = verifyAccessToken(token);
    if (payload.role !== 'user') throw new AuthError('Not a user token');
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireAdmin – verifies the admin access token from httpOnly cookie.
 * Prioritizes admin_access_token, with fallback to access_token.
 * Attaches req.admin = { id, username, role, mustChangePassword }.
 */
function requireAdmin(req, _res, next) {
  try {
    const token = req.cookies && (req.cookies.admin_access_token || req.cookies.access_token);
    if (!token) throw new AuthError('Admin authentication required');
    const payload = verifyAccessToken(token);
    if (payload.role !== 'admin') throw new ForbiddenError('Admin access required');
    req.admin = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * optionalAuth – attaches req.user if a valid cookie is present, but doesn't
 * reject the request if missing. Used on public routes that have auth-aware UI.
 */
function optionalAuth(req, _res, next) {
  try {
    const token = req.cookies && req.cookies.access_token;
    if (token) {
      const payload = verifyAccessToken(token);
      if (payload.role === 'user') req.user = payload;
    }
  } catch {
    // ignore invalid token
  }
  next();
}

/**
 * mustChangePassword – rejects any request from an admin who hasn't yet
 * changed their seeded password (except the change-password endpoint itself).
 */
function blockIfMustChangePassword(req, _res, next) {
  const actor = req.admin || req.user;
  if (actor && actor.mustChangePassword) {
    return next(new ForbiddenError('You must change your password before proceeding'));
  }
  next();
}

/**
 * requireUserOrAdmin – verifies access token for either user or admin.
 */
function requireUserOrAdmin(req, _res, next) {
  try {
    const token = req.cookies && (req.cookies.access_token || req.cookies.admin_access_token);
    if (!token) throw new AuthError('Authentication required');
    const payload = verifyAccessToken(token);
    if (payload.role !== 'user' && payload.role !== 'admin') {
      throw new AuthError('Authentication required');
    }
    req.user = payload;
    if (payload.role === 'admin') req.admin = payload;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireAdmin, optionalAuth, blockIfMustChangePassword, requireUserOrAdmin };
