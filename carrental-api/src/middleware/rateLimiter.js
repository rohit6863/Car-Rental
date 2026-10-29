'use strict';
const rateLimit = require('express-rate-limit');

const WINDOW_MS   = parseInt(process.env.RATE_LIMIT_WINDOW_MS  || '900000', 10); // 15 min
const AUTH_MAX    = parseInt(process.env.RATE_LIMIT_AUTH_MAX   || '10',     10);
const GENERAL_MAX = parseInt(process.env.RATE_LIMIT_GENERAL_MAX|| '100',    10);

function jsonLimitHandler(_req, res) {
  res.status(429).json({ error: 'Too many requests, please try again later.' });
}

/** Strict limiter for auth endpoints (login, register, forgot-password). */
const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler,
  // Skip in test environment
  skip: () => process.env.NODE_ENV === 'test',
});

/** General limiter for other endpoints. */
const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
});

module.exports = { authLimiter, generalLimiter };
