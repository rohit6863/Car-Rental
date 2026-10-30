'use strict';
const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const {
  customerLoginLimiter,
  registrationLimiter,
  forgotPasswordLimiter,
  checkEmailLimiter,
  readOnlyAuthLimiter,
  googleAuthLimiter,
} = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkEmailSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.get('/csrf', readOnlyAuthLimiter, authController.getCsrf);
router.get('/csrf-token', readOnlyAuthLimiter, authController.getCsrf);
router.get('/providers', readOnlyAuthLimiter, authController.getProviders);
router.get('/google', googleAuthLimiter, authController.googleAuth);
router.get('/google/callback', googleAuthLimiter, authController.googleCallback);
router.post('/register', registrationLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', customerLoginLimiter, validate({ body: loginSchema }), authController.login);
router.post('/logout', authController.logout);
router.get('/me', readOnlyAuthLimiter, requireAuth, authController.me);
router.get('/check-email', checkEmailLimiter, validate({ query: checkEmailSchema }), authController.checkEmail);
router.post('/forgot-password', forgotPasswordLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', forgotPasswordLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post('/refresh', authController.refresh);

module.exports = router;
