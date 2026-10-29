'use strict';
const express = require('express');
const brandsController = require('../controllers/brands.controller');
const { validate } = require('../middleware/validate');
const { brandIdParamSchema } = require('../validators/brand.validator');

const router = express.Router();

router.get('/', brandsController.getAll);
router.get('/:id', validate({ params: brandIdParamSchema }), brandsController.getById);

module.exports = router;
