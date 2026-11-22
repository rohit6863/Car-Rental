'use strict';
const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

// Configuration: Strict production defaults, relaxed in development, never off!
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min
const CUSTOMER_LOGIN_MAX = parseInt(process.env.RATE_LIMIT_CUSTOMER_LOGIN_MAX || (isProd ? '10' : '30'), 10);
const ADMIN_LOGIN_MAX    = parseInt(process.env.RATE_LIMIT_ADMIN_LOGIN_MAX    || (isProd ? '5'  : '20'), 10);
const FORGOT_PASSWORD_MAX= parseInt(process.env.RATE_LIMIT_FORGOT_PASSWORD_MAX|| (isProd ? '5'  : '20'), 10);
const REGISTER_MAX       = parseInt(process.env.RATE_LIMIT_REGISTER_MAX       || (isProd ? '5'  : '20'), 10);
const CHECK_EMAIL_MAX    = parseInt(process.env.RATE_LIMIT_CHECK_EMAIL_MAX    || (isProd ? '20' : '60'), 10);
const FORM_MAX           = parseInt(process.env.RATE_LIMIT_FORM_MAX           || (isProd ? '10' : '30'), 10);
const READONLY_MAX       = parseInt(process.env.RATE_LIMIT_READONLY_MAX       || (isProd ? '100': '300'), 10);
const GOOGLE_AUTH_MAX    = parseInt(process.env.RATE_LIMIT_GOOGLE_AUTH_MAX    || (isProd ? '10' : '30'), 10);
const PAYMENT_ORDER_MAX  = parseInt(process.env.RATE_LIMIT_PAYMENT_ORDER_MAX  || (isProd ? '20' : '60'), 10);
const PAYMENT_VERIFY_MAX = parseInt(process.env.RATE_LIMIT_PAYMENT_VERIFY_MAX || (isProd ? '30' : '90'), 10);
const GENERAL_MAX        = parseInt(process.env.RATE_LIMIT_GENERAL_MAX        || (isProd ? '100': '300'), 10);

function createLimitHandler(message) {
  return (req, res) => {
    // Standard Retry-After calculation if available from rate-limit headers
    const retryAfter = res.getHeader('Retry-After');
    const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : Math.ceil(WINDOW_MS / 1000);
    const minutes = Math.max(1, Math.ceil(retrySeconds / 60));
    res.status(429).json({
      error: `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      message: message || 'Too many requests, please try again later.',
      retryAfter: retrySeconds,
    });
  };
}

const shouldSkip = () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT;

/** Customer login limiter (keyed on IP + route group) */
const customerLoginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: CUSTOMER_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createLimitHandler('Too many customer login attempts. Please try again later.'),
  skip: shouldSkip,
});

/** Admin login limiter (keyed on IP + route group, isolated from customer) */
const adminLoginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: ADMIN_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createLimitHandler('Too many admin login attempts. Please try again later.'),
  skip: shouldSkip,
});

/** Forgot / Reset password limiter */
const forgotPasswordLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: FORGOT_PASSWORD_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many password reset requests. Please try again later.'),
  skip: shouldSkip,
});

/** Registration limiter */
const registrationLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: REGISTER_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many registration requests. Please try again later.'),
  skip: shouldSkip,
});

/** Check-email helper limiter */
const checkEmailLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: CHECK_EMAIL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many email check requests. Please try again later.'),
  skip: shouldSkip,
});

/** Public contact / newsletter form limiter */
const publicFormLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: FORM_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many form submissions. Please try again later.'),
  skip: shouldSkip,
});

/** Read-only auth helper calls (/me, /csrf, etc.) */
const readOnlyAuthLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: READONLY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many requests. Please try again later.'),
  skip: shouldSkip,
});

/** Google OAuth limiter (keyed on IP + route group) */
const googleAuthLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: () => (process.env.RATE_LIMIT_GOOGLE_AUTH_MAX ? parseInt(process.env.RATE_LIMIT_GOOGLE_AUTH_MAX, 10) : GOOGLE_AUTH_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many Google sign-in attempts. Please try again later.'),
  skip: shouldSkip,
});

/** Payment order creation limiter */
const paymentOrderLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: () => (process.env.RATE_LIMIT_PAYMENT_ORDER_MAX ? parseInt(process.env.RATE_LIMIT_PAYMENT_ORDER_MAX, 10) : PAYMENT_ORDER_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many payment order requests. Please try again later.'),
  skip: shouldSkip,
});

/** Payment verify limiter */
const paymentVerifyLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: () => (process.env.RATE_LIMIT_PAYMENT_VERIFY_MAX ? parseInt(process.env.RATE_LIMIT_PAYMENT_VERIFY_MAX, 10) : PAYMENT_VERIFY_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many payment verification attempts. Please try again later.'),
  skip: shouldSkip,
});

/** General application limiter */
const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: GENERAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler('Too many requests, please try again later.'),
  skip: shouldSkip,
});

module.exports = {
  customerLoginLimiter,
  adminLoginLimiter,
  forgotPasswordLimiter,
  registrationLimiter,
  checkEmailLimiter,
  publicFormLimiter,
  readOnlyAuthLimiter,
  googleAuthLimiter,
  paymentOrderLimiter,
  paymentVerifyLimiter,
  generalLimiter,
  CONFIG: {
    WINDOW_MS,
    CUSTOMER_LOGIN_MAX,
    ADMIN_LOGIN_MAX,
    FORGOT_PASSWORD_MAX,
    REGISTER_MAX,
    CHECK_EMAIL_MAX,
    FORM_MAX,
    READONLY_MAX,
    GOOGLE_AUTH_MAX,
    PAYMENT_ORDER_MAX,
    PAYMENT_VERIFY_MAX,
    GENERAL_MAX,
  },
};
