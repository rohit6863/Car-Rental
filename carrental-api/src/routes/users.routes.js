'use strict';
const express = require('express');
const usersController = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { profileUpdateSchema } = require('../validators/user.validator');
const { changePasswordSchema } = require('../validators/auth.validator');

const router = express.Router();

router.use(requireAuth);

router.get('/profile', usersController.getProfile);
router.put('/profile', validate({ body: profileUpdateSchema }), usersController.updateProfile);
router.put('/password', validate({ body: changePasswordSchema }), usersController.updatePassword);

module.exports = router;
