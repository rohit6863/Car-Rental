'use strict';
const express = require('express');
const adminUsersController = require('../../controllers/admin/users.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { idParamSchema, kycUpdateSchema } = require('../../validators/fleetOps.validator');

const router = express.Router();

router.use(requireAdmin);
router.get('/', adminUsersController.getAll);
router.patch('/:id/kyc', validate({ params: idParamSchema, body: kycUpdateSchema }), adminUsersController.updateKyc);

module.exports = router;
