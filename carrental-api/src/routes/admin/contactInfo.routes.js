'use strict';
const express = require('express');
const adminContactInfoController = require('../../controllers/admin/contactInfo.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { contactInfoUpdateSchema } = require('../../validators/common.validator');

const router = express.Router();

router.use(requireAdmin);

router.get('/', adminContactInfoController.get);
router.put('/', validate({ body: contactInfoUpdateSchema }), adminContactInfoController.update);

module.exports = router;
