'use strict';
const express = require('express');
const adminSubscribersController = require('../../controllers/admin/subscribers.controller');
const { requireAdmin } = require('../../middleware/auth');

const router = express.Router();

router.use(requireAdmin);
router.get('/', adminSubscribersController.getAll);

module.exports = router;
