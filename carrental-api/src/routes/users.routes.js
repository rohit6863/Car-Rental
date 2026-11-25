'use strict';
const express = require('express');
const usersController = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { profileUpdateSchema, kycSubmitSchema } = require('../validators/user.validator');
const { changePasswordSchema } = require('../validators/auth.validator');
const { kycUpload, verifyUploadMagicBytes, cleanupUploadedFiles } = require('../utils/upload');

const router = express.Router();

router.use(requireAuth);

router.get('/profile', usersController.getProfile);
router.put('/profile', validate({ body: profileUpdateSchema }), usersController.updateProfile);
router.put('/password', validate({ body: changePasswordSchema }), usersController.updatePassword);

router.post(
  '/kyc',
  kycUpload.single('kycDocument'),
  verifyUploadMagicBytes,
  validate({ body: kycSubmitSchema }),
  usersController.submitKyc
);
router.get('/kyc-document', usersController.getKycDocument);

router.use((err, req, _res, next) => {
  cleanupUploadedFiles(req);
  next(err);
});

module.exports = router;
