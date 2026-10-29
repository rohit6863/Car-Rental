'use strict';
const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkEmailSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.get('/csrf', authController.getCsrf);
router.get('/csrf-token', authController.getCsrf);
router.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);
router.get('/check-email', validate({ query: checkEmailSchema }), authController.checkEmail);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post('/refresh', authController.refresh);

module.exports = router;
