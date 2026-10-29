'use strict';
const express = require('express');
const adminUsersController = require('../../controllers/admin/users.controller');
const { requireAdmin } = require('../../middleware/auth');

const router = express.Router();

router.use(requireAdmin);
router.get('/', adminUsersController.getAll);

module.exports = router;
