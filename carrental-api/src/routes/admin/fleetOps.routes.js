'use strict';
const express = require('express');
const fleetOpsController = require('../../controllers/admin/fleetOps.controller');
const { requireAdmin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  idParamSchema,
  maintenanceCreateSchema,
  maintenanceUpdateSchema,
  pricingUpdateSchema,
  noteCreateSchema,
  noteUpdateSchema,
} = require('../../validators/fleetOps.validator');

const router = express.Router();

router.use(['/analytics', '/alerts', '/maintenance', '/pricing', '/notes'], requireAdmin);

router.get('/analytics', fleetOpsController.getAnalytics);
router.get('/alerts', fleetOpsController.getAlerts);

router.get('/maintenance', fleetOpsController.listMaintenance);
router.post('/maintenance', validate({ body: maintenanceCreateSchema }), fleetOpsController.createMaintenance);
router.patch('/maintenance/:id', validate({ params: idParamSchema, body: maintenanceUpdateSchema }), fleetOpsController.updateMaintenance);
router.delete('/maintenance/:id', validate({ params: idParamSchema }), fleetOpsController.deleteMaintenance);

router.get('/pricing', fleetOpsController.getPricing);
router.put('/pricing', validate({ body: pricingUpdateSchema }), fleetOpsController.updatePricing);

router.get('/notes', fleetOpsController.listNotes);
router.post('/notes', validate({ body: noteCreateSchema }), fleetOpsController.createNote);
router.patch('/notes/:id', validate({ params: idParamSchema, body: noteUpdateSchema }), fleetOpsController.updateNote);
router.delete('/notes/:id', validate({ params: idParamSchema }), fleetOpsController.deleteNote);

module.exports = router;
