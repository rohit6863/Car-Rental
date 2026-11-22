'use strict';
const { z } = require('zod');

// Short list of very common passwords to reject
const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'asdfghjkl1',
  'admin123456',
  'administrator',
  'letmein123',
  'welcome1234',
  'iloveyou123',
  'changeme123',
]);

const isCommonPassword = (pwd) => COMMON_PASSWORDS.has(String(pwd || '').toLowerCase());

const registerSchema = z.object({
  fullname: z.string({ message: 'Full name is required' }).trim().min(2, 'Full name must be at least 2 characters').max(120, 'Full name cannot exceed 120 characters'),
  emailid: z.string({ message: 'Email is required' }).trim().email('Invalid email address').max(100, 'Email cannot exceed 100 characters'),
  mobileno: z.string({ message: 'Mobile number is required' }).trim().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  password: z.string({ message: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .refine((val) => !isCommonPassword(val), {
      message: 'Password is too common or easily guessed. Please choose a stronger password.',
    }),
  confirmpassword: z.string({ message: 'Confirm password is required' })
    .min(8, 'Confirm password must be at least 8 characters')
    .max(128, 'Confirm password cannot exceed 128 characters'),
}).refine(data => data.password === data.confirmpassword, {
  message: 'Passwords do not match',
  path: ['confirmpassword'],
});

const loginSchema = z.object({
  email: z.string({ message: 'Email is required' }).trim().email('Invalid email address').max(100),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required').max(128, 'Password cannot exceed 128 characters'),
});

const adminLoginSchema = z.object({
  username: z.string({ message: 'Username is required' }).trim().min(1, 'Username is required').max(100),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required').max(128, 'Password cannot exceed 128 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string({ message: 'Email is required' }).trim().email('Invalid email address').max(100),
});

const resetPasswordSchema = z.object({
  token: z.string({ message: 'Token is required' }).trim().min(1, 'Token is required').max(128),
  newpassword: z.string({ message: 'New password is required' })
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password cannot exceed 128 characters')
    .refine((val) => !isCommonPassword(val), {
      message: 'Password is too common or easily guessed. Please choose a stronger password.',
    }),
  confirmpassword: z.string({ message: 'Confirm password is required' })
    .min(8, 'Confirm password must be at least 8 characters')
    .max(128, 'Confirm password cannot exceed 128 characters'),
}).refine(data => data.newpassword === data.confirmpassword, {
  message: 'Passwords do not match',
  path: ['confirmpassword'],
});

const checkEmailSchema = z.object({
  email: z.string({ message: 'Email is required' }).trim().email('Invalid email address').max(100),
});

// Customer change password (min 8 chars)
const changePasswordSchema = z.object({
  password: z.string({ message: 'Current password is required' }).min(1, 'Current password is required').max(128, 'Current password cannot exceed 128 characters'),
  newpassword: z.string({ message: 'New password is required' })
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password cannot exceed 128 characters')
    .refine((val) => !isCommonPassword(val), {
      message: 'Password is too common or easily guessed. Please choose a stronger password.',
    }),
  confirmpassword: z.string({ message: 'Confirm password is required' })
    .min(8, 'Confirm password must be at least 8 characters')
    .max(128, 'Confirm password cannot exceed 128 characters'),
}).refine(data => data.newpassword === data.confirmpassword, {
  message: 'Passwords do not match',
  path: ['confirmpassword'],
});

// Admin change password (min 12 chars)
const adminChangePasswordSchema = z.object({
  password: z.string({ message: 'Current password is required' }).min(1, 'Current password is required').max(128, 'Current password cannot exceed 128 characters'),
  newpassword: z.string({ message: 'New password is required' })
    .min(12, 'New password must be at least 12 characters')
    .max(128, 'New password cannot exceed 128 characters')
    .refine((val) => !isCommonPassword(val), {
      message: 'Password is too common or easily guessed. Please choose a stronger password.',
    }),
  confirmpassword: z.string({ message: 'Confirm password is required' })
    .min(12, 'Confirm password must be at least 12 characters')
    .max(128, 'Confirm password cannot exceed 128 characters'),
}).refine(data => data.newpassword === data.confirmpassword, {
  message: 'Passwords do not match',
  path: ['confirmpassword'],
});

module.exports = {
  COMMON_PASSWORDS,
  isCommonPassword,
  registerSchema,
  loginSchema,
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkEmailSchema,
  changePasswordSchema,
  adminChangePasswordSchema,
};
