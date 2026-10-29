'use strict';
const { query, withTransaction } = require('../db/pool');
const { computeRentalAmount } = require('../utils/dates');
const { ConflictError, NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');

class PaymentsService {
  /**
   * Submit manual payment details.
   * Total amount is computed SERVER-SIDE from dates x price per day.
   */
  async submitPayment({ booking_id, userEmail, payment_method, transaction_id }) {
    // 1. Verify booking ownership and details
    const [bookings] = await query(`
      SELECT b.id, b.userEmail, b.VehicleId, b.FromDate, b.ToDate, b.Status, v.PricePerDay
      FROM tblbooking b
      JOIN tblvehicles v ON v.id = b.VehicleId
      WHERE b.id = ?
    `, [booking_id]);

    if (bookings.length === 0) throw new NotFoundError('Booking');
    const booking = bookings[0];

    if (booking.userEmail !== userEmail) {
      throw new ForbiddenError('You can only submit payment for your own booking');
    }

    if (booking.Status !== 1) {
      throw new ValidationError('Payment can only be submitted for confirmed bookings');
    }

    // 2. Compute exact amount server-side
    const { days, totalAmount } = computeRentalAmount(booking.FromDate, booking.ToDate, booking.PricePerDay);

    // 3. Insert payment in transaction
    return withTransaction(async (conn) => {
      const [existing] = await conn.execute(
        'SELECT id, payment_status FROM tblpayments WHERE booking_id = ? FOR UPDATE',
        [booking_id]
      );

      if (existing.length > 0) {
        if (existing[0].payment_status === 'confirmed') {
          throw new ConflictError('Payment for this booking is already confirmed');
        }
        // Update existing pending payment
        await conn.execute(`
          UPDATE tblpayments
          SET amount = ?, payment_method = ?, transaction_id = ?, payment_status = 'pending', payment_date = NOW()
          WHERE id = ?
        `, [totalAmount, payment_method, transaction_id, existing[0].id]);

        return {
          id: existing[0].id,
          amount: totalAmount,
          days,
          payment_status: 'pending',
          message: 'Payment updated successfully. Waiting for admin confirmation.'
        };
      }

      // Insert new payment record
      const [result] = await conn.execute(`
        INSERT INTO tblpayments (booking_id, amount, payment_method, transaction_id, payment_status, currency)
        VALUES (?, ?, ?, ?, 'pending', 'INR')
      `, [booking_id, totalAmount, payment_method, transaction_id]);

      return {
        id: result.insertId,
        amount: totalAmount,
        days,
        payment_status: 'pending',
        message: 'Payment submitted successfully. Waiting for admin confirmation.'
      };
    });
  }

  /**
   * Get receipt details with strict IDOR protection.
   * Admins can view any receipt; customers can ONLY view their own.
   */
  async getReceipt(bookingId, currentUser) {
    const [rows] = await query(`
      SELECT
        b.id as booking_id,
        b.userEmail,
        b.FromDate,
        b.ToDate,
        p.id as payment_id,
        p.amount,
        p.payment_method,
        p.transaction_id,
        p.payment_status,
        p.payment_date,
        p.confirmation_date,
        v.VehiclesTitle,
        v.PricePerDay,
        u.FullName,
        u.Address,
        u.City,
        u.Country
      FROM tblbooking b
      JOIN tblpayments p ON p.booking_id = b.id
      JOIN tblvehicles v ON v.id = b.VehicleId
      JOIN tblusers u ON u.EmailId = b.userEmail
      WHERE b.id = ?
    `, [bookingId]);

    if (rows.length === 0) {
      throw new NotFoundError('Receipt or confirmed payment');
    }

    const receipt = rows[0];

    // Ownership check (IDOR fix)
    if (currentUser.role !== 'admin' && receipt.userEmail !== currentUser.email) {
      throw new ForbiddenError('You do not have permission to view this receipt');
    }

    if (receipt.payment_status !== 'confirmed') {
      throw new ValidationError('Receipt is only available for confirmed payments');
    }

    // Standardize inclusive day count
    const { days, totalAmount } = computeRentalAmount(receipt.FromDate, receipt.ToDate, receipt.PricePerDay);

    return {
      receiptNumber: `RCP${String(receipt.booking_id).padStart(6, '0')}`,
      date: new Date().toLocaleDateString('en-GB'),
      customer: {
        name: receipt.FullName,
        address: receipt.Address || '',
        city: receipt.City || '',
        country: receipt.Country || '',
        email: receipt.userEmail,
      },
      rental: {
        vehicle: receipt.VehiclesTitle,
        fromDate: receipt.FromDate,
        toDate: receipt.ToDate,
        durationDays: days,
      },
      payment: {
        pricePerDay: receipt.PricePerDay,
        numberOfDays: days,
        totalAmount,
        paymentMethod: receipt.payment_method,
        transactionId: receipt.transaction_id,
        paymentStatus: 'Confirmed',
        paymentDate: receipt.payment_date,
        confirmationDate: receipt.confirmation_date,
      }
    };
  }

  /**
   * Admin: List all payments.
   */
  async adminGetAll() {
    const [rows] = await query(`
      SELECT
        p.*,
        b.id as booking_id,
        b.userEmail,
        v.VehiclesTitle,
        u.FullName
      FROM tblpayments p
      JOIN tblbooking b ON b.id = p.booking_id
      JOIN tblvehicles v ON v.id = b.VehicleId
      JOIN tblusers u ON u.EmailId = b.userEmail
      ORDER BY p.payment_date DESC
    `);
    return rows;
  }

  /**
   * Admin: Confirm payment.
   */
  async adminConfirm(paymentId) {
    const [result] = await query(`
      UPDATE tblpayments
      SET payment_status = 'confirmed', confirmation_date = NOW()
      WHERE id = ?
    `, [paymentId]);

    if (result.affectedRows === 0) throw new NotFoundError('Payment');
    return { success: true, message: 'Payment Confirmed Successfully' };
  }

  /**
   * Admin: Reject payment.
   */
  async adminReject(paymentId) {
    const [result] = await query(`
      UPDATE tblpayments
      SET payment_status = 'rejected', confirmation_date = NOW()
      WHERE id = ?
    `, [paymentId]);

    if (result.affectedRows === 0) throw new NotFoundError('Payment');
    return { success: true, message: 'Payment Rejected Successfully' };
  }
}

module.exports = new PaymentsService();
