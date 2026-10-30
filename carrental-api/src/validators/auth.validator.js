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
  email: z.string().trim().email('Invalid email address').max(100),
  password: z.string().min(1, 'Password is required').max(100),
});

const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(100),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(100),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required').max(128),
  newpassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
  confirmpassword: z.string().min(6).max(100),
}).refine(data => data.newpassword === data.confirmpassword, {
  message: "New password and Confirm Password do not match",
  path: ['confirmpassword'],
});

const checkEmailSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(100),
});

const changePasswordSchema = z.object({
  password: z.string().min(1, 'Current password is required').max(100),
  newpassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
  confirmpassword: z.string().min(6).max(100),
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
