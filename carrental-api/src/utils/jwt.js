'use strict';
const jwt = require('jsonwebtoken');
const { AuthError } = require('./errors');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'dev_access_secret_change_me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * Issue an access token for a user or admin.
 * @param {{ id: number, email?: string, username?: string, role: 'user'|'admin', mustChangePassword?: boolean }} payload
 */
function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP });
}

/**
 * Issue a refresh token (stored server-side in tbl_refresh_tokens).
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    throw new AuthError('Invalid or expired access token');
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    throw new AuthError('Invalid or expired refresh token');
  }
}

/**
 * Cookie options for the access token.
 * Secure is enabled in production automatically.
 */
function accessCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge:   15 * 60 * 1000, // 15 minutes
    path:     '/api',
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    path:     '/api/auth',
  };
}

function clearCookies(res) {
  res.clearCookie('access_token',  { path: '/api' });
  res.clearCookie('refresh_token', { path: '/api/auth' });
}

function adminAccessCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge:   15 * 60 * 1000, // 15 minutes
    path:     '/api',
  };
}

function adminRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    path:     '/api/admin',
  };
}

function clearAdminCookies(res) {
  res.clearCookie('admin_access_token',  { path: '/api' });
  res.clearCookie('admin_refresh_token', { path: '/api/admin' });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  accessCookieOptions,
  refreshCookieOptions,
  clearCookies,
  adminAccessCookieOptions,
  adminRefreshCookieOptions,
  clearAdminCookies,
};
