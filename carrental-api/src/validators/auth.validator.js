'use strict';
const { z } = require('zod');

const registerSchema = z.object({
  fullname: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  emailid: z.string().trim().email('Invalid email address').max(100),
  mobileno: z.string().trim().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  confirmpassword: z.string().min(6).max(100),
}).refine(data => data.password === data.confirmpassword, {
  message: "Password and Confirm Password do not match",
  path: ['confirmpassword'],
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newpassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmpassword: z.string().min(6),
}).refine(data => data.newpassword === data.confirmpassword, {
  message: "New password and Confirm Password do not match",
  path: ['confirmpassword'],
});

const checkEmailSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

const changePasswordSchema = z.object({
  password: z.string().min(1, 'Current password is required'),
  newpassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmpassword: z.string().min(6),
}).refine(data => data.newpassword === data.confirmpassword, {
  message: "New password and Confirm Password do not match",
  path: ['confirmpassword'],
});

module.exports = {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  checkEmailSchema,
  changePasswordSchema,
};
