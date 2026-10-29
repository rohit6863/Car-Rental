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

module.exports = {
  profileUpdateSchema,
};
