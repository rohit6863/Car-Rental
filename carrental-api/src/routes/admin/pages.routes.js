'use strict';
const express = require('express');
const adminPagesController = require('../../controllers/admin/pages.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { pageTypeParamSchema, pageUpdateSchema } = require('../../validators/common.validator');

const router = express.Router();

router.use(requireAdmin);

router.get('/', adminPagesController.getAll);
router.put('/:type', validate({ params: pageTypeParamSchema, body: pageUpdateSchema }), adminPagesController.update);

module.exports = router;
