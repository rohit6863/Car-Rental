'use strict';
const { z } = require('zod');

const submitPaymentSchema = z.object({
  booking_id: z.coerce.number().int().positive('Booking ID must be a positive integer'),
  payment_method: z.enum(['Credit Card', 'Debit Card', 'Bank Transfer', 'UPI']),
  transaction_id: z.string().trim().min(3, 'Transaction ID must be at least 3 characters').max(100),
  // Note: 'amount' is deliberately NOT validated from the client payload to be used,
  // because the server computes the exact amount from booking dates x price per day!
});

const createOrderSchema = z.object({
  bookingId: z.coerce.number().int().positive().optional(),
  booking_id: z.coerce.number().int().positive().optional(),
}).refine((data) => data.bookingId || data.booking_id, {
  message: 'Booking ID is required',
});

const verifyPaymentSchema = z.object({
  bookingId: z.coerce.number().int().positive('Booking ID must be a positive integer'),
  orderId: z.string().trim().min(1, 'Order ID is required'),
  paymentId: z.string().trim().min(1, 'Payment ID is required'),
  signature: z.string().trim().min(1, 'Signature is required'),
});

const paymentIdParamSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  paymentId: z.coerce.number().int().positive().optional(),
});

const receiptBookingParamSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

module.exports = {
  submitPaymentSchema,
  createOrderSchema,
  verifyPaymentSchema,
  paymentIdParamSchema,
  receiptBookingParamSchema,
};