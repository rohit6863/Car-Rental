'use strict';
const express = require('express');
const contactController = require('../controllers/contact.controller');
const { validate } = require('../middleware/validate');
const { contactQuerySchema } = require('../validators/common.validator');

const router = express.Router();

router.post('/query', validate({ body: contactQuerySchema }), contactController.submitQuery);
router.get('/info', contactController.getContactInfo);

module.exports = router;
