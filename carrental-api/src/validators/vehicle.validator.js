'use strict';
const { z } = require('zod');

const vehicleSearchSchema = z.object({
  brand: z.string().trim().optional(),
  fueltype: z.string().trim().optional(),
});

const vehicleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const vehicleImageNumParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  num: z.coerce.number().int().min(1).max(5),
});

const vehicleFormSchema = z.object({
  vehicletitle: z.string().trim().min(2).max(150),
  brandname: z.coerce.number().int().positive('Brand is required'),
  vehicalorcview: z.string().trim().min(5),
  priceperday: z.coerce.number().int().positive('Price per day must be positive'),
  fueltype: z.enum(['Petrol', 'Diesel', 'CNG']),
  modelyear: z.coerce.number().int().min(1990).max(2050),
  seatingcapacity: z.coerce.number().int().min(1).max(20),
  airconditioner: z.coerce.number().int().min(0).max(1).optional().default(0),
  powerdoorlocks: z.coerce.number().int().min(0).max(1).optional().default(0),
  antilockbrakingsys: z.coerce.number().int().min(0).max(1).optional().default(0),
  brakeassist: z.coerce.number().int().min(0).max(1).optional().default(0),
  powersteering: z.coerce.number().int().min(0).max(1).optional().default(0),
  driverairbag: z.coerce.number().int().min(0).max(1).optional().default(0),
  passengerairbag: z.coerce.number().int().min(0).max(1).optional().default(0),
  powerwindow: z.coerce.number().int().min(0).max(1).optional().default(0),
  cdplayer: z.coerce.number().int().min(0).max(1).optional().default(0),
  centrallocking: z.coerce.number().int().min(0).max(1).optional().default(0),
  crashcensor: z.coerce.number().int().min(0).max(1).optional().default(0),
  leatherseats: z.coerce.number().int().min(0).max(1).optional().default(0),
});

module.exports = {
  vehicleSearchSchema,
  vehicleIdParamSchema,
  vehicleImageNumParamSchema,
  vehicleFormSchema,
};
