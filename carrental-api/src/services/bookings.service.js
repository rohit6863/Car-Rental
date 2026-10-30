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
      LEFT JOIN tblpayments p ON p.booking_id = bk.id
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

      await conn.execute('UPDATE tblbooking SET Status = 2 WHERE id = ?', [bookingId]);

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
