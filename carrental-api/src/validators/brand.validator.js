'use strict';
const { z } = require('zod');

const brandFormSchema = z.object({
  brand: z.string().trim().min(2, 'Brand name must be at least 2 characters').max(120),
});

const brandIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

module.exports = {
  brandFormSchema,
  brandIdParamSchema,
};
