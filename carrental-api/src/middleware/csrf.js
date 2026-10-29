'use strict';
const crypto = require('crypto');
const { ForbiddenError } = require('../utils/errors');

const CSRF_SECRET = process.env.CSRF_SECRET || 'dev_csrf_secret_change_me_in_production';

// Methods that MUST carry a CSRF token
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Generate a CSRF token tied to a session nonce.
 * Token = HMAC-SHA256(secret, nonce) — double-submit cookie pattern.
 * @param {string} nonce
 * @returns {string}
 */
function generateCsrfToken(nonce) {
  return crypto.createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex');
}

/**
 * Middleware: on every GET response set a readable csrf_nonce cookie.
 * On every unsafe request validate the X-CSRF-Token header.
 */
function csrfMiddleware(req, res, next) {
  // Webhook bypass – handled in app.js before this middleware
  if (req.path && req.path.includes('/webhook')) return next();

  // Ensure the nonce cookie exists
  if (!req.cookies.csrf_nonce) {
    const nonce = crypto.randomBytes(16).toString('hex');
    res.cookie('csrf_nonce', nonce, {
      httpOnly: false,   // frontend must read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    req.cookies.csrf_nonce = nonce;
  }

  if (UNSAFE_METHODS.has(req.method)) {
    const nonce         = req.cookies.csrf_nonce;
    const expected      = generateCsrfToken(nonce);
    const received      = req.headers['x-csrf-token'];

    if (!received || typeof received !== 'string' || received.length !== expected.length) {
      return next(new ForbiddenError('Invalid CSRF token'));
    }

    const valid = crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received, 'hex')
    );
    if (!valid) return next(new ForbiddenError('Invalid CSRF token'));
  }

  // Expose token-generation helper for controllers that need to send the token
  res.locals.csrfToken = () => generateCsrfToken(req.cookies.csrf_nonce);

  next();
}

module.exports = { csrfMiddleware, generateCsrfToken };
