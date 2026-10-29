'use strict';
const express = require('express');
const pagesController = require('../controllers/pages.controller');
const { validate } = require('../middleware/validate');
const { pageTypeParamSchema } = require('../validators/common.validator');

const router = express.Router();

router.get('/:type', validate({ params: pageTypeParamSchema }), pagesController.getPage);

module.exports = router;
