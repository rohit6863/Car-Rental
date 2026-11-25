'use strict';
const { z } = require('zod');

const profileUpdateSchema = z.object({
  fullname: z.string().trim().min(2).max(120),
  mobilenumber: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  dob: z.string().trim().max(100).optional().default(''),
  address: z.string().trim().max(255).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  country: z.string().trim().max(100).optional().default(''),
});

const kycSubmitSchema = z.object({
  drivingLicenseNo: z
    .string()
    .trim()
    .min(5, 'Driving License number must be at least 5 characters')
    .max(50, 'Driving License number must not exceed 50 characters'),
});

module.exports = {
  profileUpdateSchema,
  kycSubmitSchema,
};
