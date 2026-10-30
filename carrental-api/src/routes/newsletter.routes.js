'use strict';
const express = require('express');
const newsletterController = require('../controllers/newsletter.controller');
const { validate } = require('../middleware/validate');
const { publicFormLimiter } = require('../middleware/rateLimiter');
const { newsletterSchema } = require('../validators/common.validator');

const router = express.Router();

router.post('/subscribe', publicFormLimiter, validate({ body: newsletterSchema }), newsletterController.subscribe);

module.exports = router;
