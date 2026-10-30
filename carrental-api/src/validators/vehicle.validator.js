'use strict';
const { z } = require('zod');

const vehicleSearchSchema = z.object({
  brand: z.string().trim().max(100).optional(),
  fueltype: z.string().trim().max(50).optional(),
});

const vehicleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const vehicleImageNumParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  num: z.coerce.number().int().min(1).max(5),
});

const makeNumberField = (label, min, max, positiveOnly = false) => z.preprocess((val) => {
  if (val === '' || val === undefined || val === null) return undefined;
  const n = Number(val);
  return isNaN(n) ? 'NOT_A_NUMBER' : n;
}, z.union([
  z.number({ message: `${label} must be a number` })
    .int(`${label} must be an integer`)
    .refine((n) => !positiveOnly || n > 0, { message: `${label} must be positive` })
    .refine((n) => min === undefined || n >= min, { message: `${label} must be at least ${min}` })
    .refine((n) => max === undefined || n <= max, { message: `${label} must not exceed ${max}` }),
  z.undefined().refine(() => false, { message: `${label} is required` }),
  z.literal('NOT_A_NUMBER').refine(() => false, { message: `${label} must be a number` }),
]));

const brandField = z.preprocess((val) => {
  if (val === '' || val === undefined || val === null) return undefined;
  const n = Number(val);
  return isNaN(n) ? 'NOT_A_NUMBER' : n;
}, z.union([
  z.number().int().positive({ message: 'Brand is required' }),
  z.undefined().refine(() => false, { message: 'Brand is required' }),
  z.literal('NOT_A_NUMBER').refine(() => false, { message: 'Brand is required' }),
]));

const vehicleTitleField = z.preprocess((val) => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}, z.string()
  .min(1, 'Vehicle title is required')
  .min(2, 'Vehicle title must be at least 2 characters')
  .max(150, 'Vehicle title must not exceed 150 characters'));

const vehicleOverviewField = z.preprocess((val) => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}, z.string()
  .min(1, 'Vehicle overview is required')
  .min(5, 'Vehicle overview must be at least 5 characters')
  .max(5000, 'Vehicle overview must not exceed 5000 characters'));

const fuelTypeField = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  return String(val).trim();
}, z.union([
  z.string().refine((v) => ['Petrol', 'Diesel', 'CNG'].includes(v), { message: 'Fuel type must be Petrol, Diesel, or CNG' }),
  z.undefined().refine(() => false, { message: 'Fuel type is required' }),
]));

const checkboxField = z.preprocess((val) => {
  if (val === '1' || val === 1 || val === 'on' || val === true || val === 'true') return 1;
  return 0;
}, z.number().int().min(0).max(1));

const vehicleFormSchema = z.object({
  vehicletitle: vehicleTitleField,
  brandname: brandField,
  vehicalorcview: vehicleOverviewField,
  priceperday: makeNumberField('Price per day', 1, 10000000, true),
  fueltype: fuelTypeField,
  modelyear: makeNumberField('Model year', 1990, 2050),
  seatingcapacity: makeNumberField('Seating capacity', 1, 20),
  airconditioner: checkboxField,
  powerdoorlocks: checkboxField,
  antilockbrakingsys: checkboxField,
  brakeassist: checkboxField,
  powersteering: checkboxField,
  driverairbag: checkboxField,
  passengerairbag: checkboxField,
  powerwindow: checkboxField,
  cdplayer: checkboxField,
  centrallocking: checkboxField,
  crashcensor: checkboxField,
  leatherseats: checkboxField,
});

module.exports = {
  vehicleSearchSchema,
  vehicleIdParamSchema,
  vehicleImageNumParamSchema,
  vehicleFormSchema,
};
