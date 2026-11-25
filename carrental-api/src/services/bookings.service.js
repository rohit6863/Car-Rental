'use strict';
const { query, withTransaction } = require('../db/pool');
const { computeRentalAmount } = require('../utils/dates');
const { ConflictError, NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const { auditLog } = require('../utils/auditLogger');

class BookingsService {
  /**
   * Create a new booking (Pending status = 0).
   */
  async createBooking({ userEmail, vehicle_id, fromdate, todate, message }) {
    // 1. Check vehicle existence and status
    const [vehicles] = await query('SELECT id, PricePerDay FROM tblvehicles WHERE id = ?', [vehicle_id]);
    if (vehicles.length === 0) throw new NotFoundError('Vehicle');

    // 2. Check if vehicle is available for these dates
    const [existing] = await query(`
      SELECT COUNT(*) as bookingCount
      FROM tblbooking
      WHERE VehicleId = ?
        AND Status = 1
        AND (
          (FromDate BETWEEN ? AND ?)
          OR (ToDate BETWEEN ? AND ?)
          OR (? BETWEEN FromDate AND ToDate)
        )
    `, [vehicle_id, fromdate, todate, fromdate, todate, fromdate]);

    if (existing[0].bookingCount > 0) {
      throw new ConflictError('Vehicle is not available for the selected dates. Please choose different dates.');
    }

    // 3. Insert new booking with Status = 0 (Pending)
    const [result] = await query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, ?, ?, ?, 0)
    `, [userEmail, vehicle_id, fromdate, todate, message || '']);

    const { days, totalAmount } = computeRentalAmount(fromdate, todate, vehicles[0].PricePerDay);

    return {
      id: result.insertId,
      days,
      totalAmount,
      status: 0,
      message: 'Booking successful.'
    };
  }

  /**
   * Get all bookings for a user.
   * Day count and totalAmount are calculated server-side INCLUSIVE.
   */
  async getUserBookings(userEmail) {
    const [rows] = await query(`
      SELECT
        bk.id as bookingId,
        bk.FromDate,
        bk.ToDate,
        bk.message,
        bk.Status,
        bk.PostingDate,
        bk.ReturnedAt,
        bk.ReturnOdometerKm,
        bk.ReturnNotes,
        v.id as vid,
        v.VehiclesTitle,
        v.Vimage1,
        v.PricePerDay,
        b.BrandName,
        p.id as payment_id,
        p.amount,
        p.payment_method,
        p.transaction_id,
        COALESCE(p.payment_status, 'unpaid') as payment_status
      FROM tblbooking bk
      JOIN tblvehicles v ON bk.VehicleId = v.id
      JOIN tblbrands b ON b.id = v.VehiclesBrand
      LEFT JOIN tblpayments p ON p.id = (
        SELECT MAX(id) FROM tblpayments WHERE booking_id = bk.id
      )
      WHERE bk.userEmail = ?
      ORDER BY bk.id DESC
    `, [userEmail]);

    return rows.map(r => {
      let days = 0;
      let totalAmount = 0;
      if (r.FromDate && r.ToDate) {
        try {
          const calc = computeRentalAmount(r.FromDate, r.ToDate, r.PricePerDay);
          days = calc.days;
          totalAmount = calc.totalAmount;
        } catch {
          // fallback in case of invalid date string
        }
      }
      return {
        ...r,
        days,
        totalAmount,
      };
    });
  }

  /**
   * Admin: List all bookings.
   */
  async adminGetAll() {
    const [rows] = await query(`
      SELECT
        bk.id,
        bk.FromDate,
        bk.ToDate,
        bk.message,
        bk.Status,
        bk.PostingDate,
        bk.ReturnedAt,
        bk.ReturnOdometerKm,
        bk.ReturnNotes,
        bk.userEmail,
        u.FullName,
        v.id as vid,
        v.VehiclesTitle,
        b.BrandName
      FROM tblbooking bk
      JOIN tblvehicles v ON v.id = bk.VehicleId
      JOIN tblusers u ON u.EmailId = bk.userEmail
      JOIN tblbrands b ON v.VehiclesBrand = b.id
      ORDER BY bk.id DESC
    `);
    return rows;
  }

  /**
   * Admin: Confirm a booking atomically with SELECT ... FOR UPDATE.
   */
  async adminConfirm(bookingId) {
    return withTransaction(async (conn) => {
      // 1. Fetch the target booking with lock
      const [bookingRows] = await conn.execute(
        'SELECT id, VehicleId, FromDate, ToDate, Status FROM tblbooking WHERE id = ? FOR UPDATE',
        [bookingId]
      );
      if (bookingRows.length === 0) throw new NotFoundError('Booking');

      const target = bookingRows[0];
      if (target.Status === 1) {
        return { success: true, message: 'Booking already confirmed' };
      }

      // 2. Lock confirmed bookings for this vehicle to check conflict
      const [conflicts] = await conn.execute(`
        SELECT id, FromDate, ToDate FROM tblbooking
        WHERE VehicleId = ?
          AND Status = 1
          AND id != ?
          AND (
            (FromDate BETWEEN ? AND ?)
            OR (ToDate BETWEEN ? AND ?)
            OR (? BETWEEN FromDate AND ToDate)
          )
        FOR UPDATE
      `, [target.VehicleId, target.id, target.FromDate, target.ToDate, target.FromDate, target.ToDate, target.FromDate]);

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        throw new ConflictError(
          `Cannot confirm: this vehicle is already booked for overlapping dates (booking #${conflict.id}: ${conflict.FromDate} to ${conflict.ToDate})`,
          {
            conflictBookingId: conflict.id,
            fromDate: conflict.FromDate,
            toDate: conflict.ToDate,
          }
        );
      }

      // 3. Atomically update booking status to 1 (Confirmed) and vehicle_status to 'Rented'
      await conn.execute('UPDATE tblbooking SET Status = 1 WHERE id = ?', [bookingId]);
      await conn.execute("UPDATE tblvehicles SET vehicle_status = 'Rented' WHERE id = ?", [target.VehicleId]);

      auditLog('BOOKING_CONFIRMED', {
        actorType: 'admin',
        actorId: bookingId,
        details: { vehicleId: target.VehicleId, fromDate: target.FromDate, toDate: target.ToDate },
      });

      return { success: true, message: 'Booking Confirmed and Vehicle Marked as Rented' };
    });
  }

  /**
   * Admin: Cancel a booking atomically.
   */
  async adminCancel(bookingId) {
    return withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, VehicleId, Status FROM tblbooking WHERE id = ? FOR UPDATE',
        [bookingId]
      );
      if (rows.length === 0) throw new NotFoundError('Booking');

      const booking = rows[0];

      // Update booking status to 2 (Cancelled)
      await conn.execute('UPDATE tblbooking SET Status = 2 WHERE id = ?', [bookingId]);

      // Invalidate pending payment orders
      await conn.execute(
        "UPDATE tblpayments SET payment_status = 'failed', failure_reason = 'Order invalidated: booking cancelled by admin' WHERE booking_id = ? AND payment_status = 'pending'",
        [bookingId]
      );

      // Flag confirmed payments for refund
      const [confirmedPayments] = await conn.execute(
        "SELECT id FROM tblpayments WHERE booking_id = ? AND payment_status = 'confirmed' FOR UPDATE",
        [bookingId]
      );
      if (confirmedPayments.length > 0) {
        await conn.execute(
          "UPDATE tblpayments SET payment_status = 'needs_refund', failure_reason = 'Booking cancelled by admin after payment; flagged for refund' WHERE booking_id = ? AND payment_status = 'confirmed'",
          [bookingId]
        );
      }

      // Check if there are any other ongoing confirmed bookings for this vehicle
      const [activeBookings] = await conn.execute(
        'SELECT id FROM tblbooking WHERE VehicleId = ? AND Status = 1 AND id != ?',
        [booking.VehicleId, booking.id]
      );

      // If no other confirmed bookings, mark as Available
      if (activeBookings.length === 0) {
        await conn.execute("UPDATE tblvehicles SET vehicle_status = 'Available' WHERE id = ?", [booking.VehicleId]);
      }

      auditLog('BOOKING_CANCELLED_BY_ADMIN', {
        actorType: 'admin',
        actorId: bookingId,
        details: { vehicleId: booking.VehicleId },
      });

      return { success: true, message: 'Booking Cancelled and Vehicle Marked as Available' };
    });
  }

  /**
   * Admin: Confirm vehicle return with exact timestamp, optional odometer & inspection notes.
   */
  async adminReturn(bookingId, { returnedAt, returnOdometerKm, returnNotes } = {}) {
    return withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, VehicleId, Status, ReturnedAt FROM tblbooking WHERE id = ? FOR UPDATE',
        [bookingId]
      );
      if (rows.length === 0) throw new NotFoundError('Booking');

      const booking = rows[0];
      if (booking.Status !== 1) {
        throw new ValidationError('Only confirmed bookings can be marked as returned');
      }
      if (booking.ReturnedAt) {
        throw new ConflictError('Booking has already been marked as returned');
      }

      const resolvedDate = returnedAt ? new Date(returnedAt) : new Date();
      if (isNaN(resolvedDate.getTime())) {
        throw new ValidationError('Invalid return date/time');
      }

      const odoValue =
        returnOdometerKm !== undefined && returnOdometerKm !== null
          ? Number(returnOdometerKm)
          : null;
      const notesValue = returnNotes ? returnNotes.trim() : null;

      await conn.execute(
        'UPDATE tblbooking SET ReturnedAt = ?, ReturnOdometerKm = ?, ReturnNotes = ? WHERE id = ?',
        [resolvedDate, odoValue, notesValue, bookingId]
      );

      if (odoValue !== null) {
        await conn.execute(
          'UPDATE tblvehicles SET OdometerKm = GREATEST(COALESCE(OdometerKm, 0), ?) WHERE id = ?',
          [odoValue, booking.VehicleId]
        );
      }

      const [activeToday] = await conn.execute(
        `SELECT id FROM tblbooking
         WHERE VehicleId = ?
           AND Status = 1
           AND ReturnedAt IS NULL
           AND id != ?
           AND CURDATE() BETWEEN FromDate AND ToDate`,
        [booking.VehicleId, booking.id]
      );

      if (activeToday.length === 0) {
        await conn.execute(
          "UPDATE tblvehicles SET vehicle_status = 'Available' WHERE id = ?",
          [booking.VehicleId]
        );
      }

      auditLog('BOOKING_RETURNED_BY_ADMIN', {
        actorType: 'admin',
        actorId: bookingId,
        details: {
          vehicleId: booking.VehicleId,
          returnedAt: resolvedDate.toISOString(),
          returnOdometerKm: odoValue,
        },
      });

      return {
        success: true,
        message: 'Vehicle return confirmed and marked Available',
        returnedAt: resolvedDate.toISOString(),
        returnOdometerKm: odoValue,
        returnNotes: notesValue,
      };
    });
  }

  /**
   * User: Cancel own booking.
   */
  async userCancel(bookingId, userEmail) {
    return withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, VehicleId, userEmail, Status FROM tblbooking WHERE id = ? FOR UPDATE',
        [bookingId]
      );
      if (rows.length === 0) throw new NotFoundError('Booking');

      const booking = rows[0];
      if (booking.userEmail !== userEmail) {
        throw new ForbiddenError('You can only cancel your own bookings');
      }

      if (booking.Status === 2) {
        return { success: true, message: 'Booking is already cancelled' };
      }

      // Check if booking has already been paid
      const [payments] = await conn.execute(
        "SELECT id, payment_status FROM tblpayments WHERE booking_id = ? AND payment_status = 'confirmed' FOR UPDATE",
        [bookingId]
      );
      if (payments.length > 0) {
        throw new ValidationError('Cannot cancel a paid booking. Please contact support.');
      }

      await conn.execute('UPDATE tblbooking SET Status = 2 WHERE id = ?', [bookingId]);

      // Invalidate pending payment orders
      await conn.execute(
        "UPDATE tblpayments SET payment_status = 'failed', failure_reason = 'Order invalidated: booking cancelled by customer' WHERE booking_id = ? AND payment_status = 'pending'",
        [bookingId]
      );

      const [activeBookings] = await conn.execute(
        'SELECT id FROM tblbooking WHERE VehicleId = ? AND Status = 1 AND id != ?',
        [booking.VehicleId, booking.id]
      );

      if (activeBookings.length === 0) {
        await conn.execute("UPDATE tblvehicles SET vehicle_status = 'Available' WHERE id = ?", [booking.VehicleId]);
      }

      auditLog('BOOKING_CANCELLED_BY_USER', {
        actorType: 'user',
        actorId: bookingId,
        details: { email: userEmail, vehicleId: booking.VehicleId },
      });

      return { success: true, message: 'Booking Cancelled successfully' };
    });
  }
}

module.exports = new BookingsService();
