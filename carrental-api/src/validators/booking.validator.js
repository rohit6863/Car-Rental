'use strict';
const { z } = require('zod');

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const checkAvailabilitySchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Vehicle ID must be a positive integer'),
  from_date: z.string().regex(dateRegex, 'From date must be in YYYY-MM-DD format'),
  to_date: z.string().regex(dateRegex, 'To date must be in YYYY-MM-DD format'),
}).refine(data => data.from_date < data.to_date, {
  message: 'End date must be after start date',
  path: ['to_date'],
});

const createBookingSchema = z.object({
  vehicle_id: z.coerce.number().int().positive('Vehicle ID must be a positive integer'),
  fromdate: z.string().regex(dateRegex, 'From date must be in YYYY-MM-DD format'),
  todate: z.string().regex(dateRegex, 'To date must be in YYYY-MM-DD format'),
  message: z.string().trim().max(255, 'Message must be at most 255 characters').optional().default(''),
}).refine(data => data.fromdate < data.todate, {
  message: 'End date must be after start date',
  path: ['todate'],
});

const bookingIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const returnBookingSchema = z.object({
  returnedAt: z
    .string()
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'ReturnedAt must be a valid date/time' })
    .optional()
    .nullable(),
  returnOdometerKm: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : val),
    z.coerce.number().int().min(0, 'Odometer must be non-negative').max(2000000).nullable().optional()
  ),
  returnNotes: z.string().trim().max(255, 'Return notes must not exceed 255 characters').optional().nullable(),
});

module.exports = {
  checkAvailabilitySchema,
  createBookingSchema,
  bookingIdParamSchema,
  returnBookingSchema,
};
