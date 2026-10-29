'use strict';
const express = require('express');
const adminBrandsController = require('../../controllers/admin/brands.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { brandFormSchema, brandIdParamSchema } = require('../../validators/brand.validator');

const router = express.Router();

router.use(requireAdmin);

router.get('/', adminBrandsController.getAll);
router.post('/', validate({ body: brandFormSchema }), adminBrandsController.create);
router.put('/:id', validate({ params: brandIdParamSchema, body: brandFormSchema }), adminBrandsController.update);
router.delete('/:id', validate({ params: brandIdParamSchema }), adminBrandsController.delete);

module.exports = router;
