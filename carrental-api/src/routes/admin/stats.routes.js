'use strict';
const express = require('express');
const adminStatsController = require('../../controllers/admin/stats.controller');
const { requireAdmin } = require('../../middleware/auth');

const router = express.Router();

router.use(requireAdmin);
router.get('/', adminStatsController.getDashboardStats);

module.exports = router;
