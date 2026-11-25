'use strict';
const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bookingIdParamSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

const maintenanceCreateSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  taskTitle: z.string().trim().min(3, 'Task description must be at least 3 characters').max(255),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
  estimatedCost: z.coerce.number().min(0).max(10000000).default(0),
  status: z.enum(['Scheduled', 'Pending', 'Completed']).default('Scheduled'),
});

const maintenanceUpdateSchema = z.object({
  status: z.enum(['Scheduled', 'Pending', 'Completed']).optional(),
  taskTitle: z.string().trim().min(3).max(255).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimatedCost: z.coerce.number().min(0).max(10000000).optional(),
});

const pricingUpdateSchema = z.object({
  weekendSurgeEnabled: z.boolean(),
  weekendSurgePct: z.coerce.number().int().min(0).max(100),
  holidaySurgeEnabled: z.boolean(),
  holidaySurgePct: z.coerce.number().int().min(0).max(100),
});

const noteCreateSchema = z.object({
  title: z.string().trim().min(2, 'Note title is required').max(200),
  description: z.string().trim().max(500).optional().default(''),
  category: z.enum(['Maintenance', 'KYC', 'Fleet Ops']).default('Fleet Ops'),
});

const noteUpdateSchema = z.object({
  isDone: z.boolean(),
});

const kycUpdateSchema = z.object({
  kycStatus: z.enum(['Pending', 'Verified', 'Rejected']),
  drivingLicenseNo: z.string().trim().max(50).optional().nullable(),
});

module.exports = {
  idParamSchema,
  bookingIdParamSchema,
  maintenanceCreateSchema,
  maintenanceUpdateSchema,
  pricingUpdateSchema,
  noteCreateSchema,
  noteUpdateSchema,
  kycUpdateSchema,
};
