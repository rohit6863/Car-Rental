'use strict';
const { z } = require('zod');

const submitPaymentSchema = z.object({
  booking_id: z.coerce.number().int().positive('Booking ID must be a positive integer'),
  payment_method: z.enum(['Credit Card', 'Debit Card', 'Bank Transfer', 'UPI']),
  transaction_id: z.string().trim().min(3, 'Transaction ID must be at least 3 characters').max(100),
  // Note: 'amount' is deliberately NOT validated from the client payload to be used,
  // because the server computes the exact amount from booking dates x price per day!
});

const paymentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const receiptBookingParamSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

module.exports = {
  submitPaymentSchema,
  paymentIdParamSchema,
  receiptBookingParamSchema,
};
