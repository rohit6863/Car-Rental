'use strict';
const express = require('express');
const adminAuthController = require('../../controllers/admin/auth.controller');
const { validate } = require('../../middleware/validate');
const { adminLoginLimiter, readOnlyAuthLimiter } = require('../../middleware/rateLimiter');
const { requireAdmin } = require('../../middleware/auth');
const { adminLoginSchema, changePasswordSchema } = require('../../validators/auth.validator');

const router = express.Router();

router.post('/login', adminLoginLimiter, validate({ body: adminLoginSchema }), adminAuthController.login);
router.post('/logout', adminAuthController.logout);
router.post('/refresh', adminAuthController.refresh);
router.get('/me', readOnlyAuthLimiter, requireAdmin, adminAuthController.me);
router.post('/change-password', requireAdmin, validate({ body: changePasswordSchema }), adminAuthController.changePassword);

module.exports = router;
