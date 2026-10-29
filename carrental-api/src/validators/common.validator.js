'use strict';
const { z } = require('zod');

const contactQuerySchema = z.object({
  fullname: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(120),
  contactno: z.string().trim().min(7).max(15),
  message: z.string().trim().min(5),
});

const newsletterSchema = z.object({
  subscriberemail: z.string().trim().email('Please provide a valid email').max(120),
});

const pageTypeParamSchema = z.object({
  type: z.enum(['aboutus', 'faqs', 'privacy', 'terms']),
});

const pageUpdateSchema = z.object({
  detail: z.string().min(1, 'Content is required'),
});

const contactInfoUpdateSchema = z.object({
  address: z.string().trim().min(5),
  email: z.string().trim().email().max(255),
  contactno: z.string().trim().min(7).max(15),
});

module.exports = {
  contactQuerySchema,
  newsletterSchema,
  pageTypeParamSchema,
  pageUpdateSchema,
  contactInfoUpdateSchema,
};
