'use strict';
const express = require('express');
const adminQueriesController = require('../../controllers/admin/queries.controller');
const { requireAdmin } = require('../../middleware/auth');

const router = express.Router();

router.use(requireAdmin);
router.get('/', adminQueriesController.getAll);
router.patch('/:id/read', adminQueriesController.markAsRead);

module.exports = router;
