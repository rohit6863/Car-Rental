'use strict';
const { query, withTransaction } = require('../db/pool');
const { computeRentalAmount } = require('../utils/dates');
const {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ServiceUnavailableError,
} = require('../utils/errors');
const { auditLog } = require('../utils/auditLogger');
const { getPaymentGateway, requirePaymentGateway } = require('./payment');

class PaymentsService {
  /**
   * Get public payment config (whether online payments are enabled, active gateway, public key)
   */
  getPublicConfig() {
    const gw = getPaymentGateway();
    return {
      available: Boolean(gw),
      gateway: gw ? gw.name : null,
      keyId: gw ? gw.publicKeyId : null,
    };
  }

  /**
   * Mock simulation helper (dev/test only)
   */
  async mockSimulate({ orderId, action, method, reason }) {
    const isProd = process.env.NODE_ENV === 'production';
    const dbName = process.env.DB_NAME || '';
    if (isProd || dbName !== 'carrental_test') {
      throw new ForbiddenError('Mock simulation is disabled in this environment');
    }
    const gateway = requirePaymentGateway();
    if (gateway.name !== 'mock') {
      throw new ValidationError('Active gateway is not mock');
    }

    if (action === 'failure') {
      const result = gateway.simulateFailure({ orderId, reason });
      await query(
        "UPDATE tblpayments SET payment_status = 'failed' WHERE gateway_order_id = ? AND payment_status = 'pending'",
        [orderId]
      );
      auditLog('PAYMENT_FAILED', {
        actorType: 'customer',
        actorId: 'mock_simulated',
        details: { orderId, reason },
      });
      return result;
    }
    return gateway.simulateSuccess({ orderId, method });
  }

  /**
   * Submit manual payment details (Legacy support)
   */
  async submitPayment({ booking_id, userEmail, payment_method, transaction_id }) {
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

    const { days, totalAmount } = computeRentalAmount(booking.FromDate, booking.ToDate, booking.PricePerDay);

    return withTransaction(async (conn) => {
      const [existing] = await conn.execute(
        'SELECT id, payment_status FROM tblpayments WHERE booking_id = ? FOR UPDATE',
        [booking_id]
      );

      if (existing.length > 0) {
        if (existing[0].payment_status === 'confirmed') {
          throw new ConflictError('Payment for this booking is already confirmed');
        }
        await conn.execute(`
          UPDATE tblpayments
          SET amount = ?, payment_method = ?, transaction_id = ?, payment_status = 'pending', payment_date = NOW(), gateway = 'manual'
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

      const [result] = await conn.execute(`
        INSERT INTO tblpayments (booking_id, amount, payment_method, transaction_id, payment_status, currency, gateway)
        VALUES (?, ?, ?, ?, 'pending', 'INR', 'manual')
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
   * Create an online payment order.
   * Calculates amount server-side; enforces confirmed status; reuses active pending order.
   */
  async createOrder({ bookingId, userEmail }) {
    if (!bookingId) {
      throw new ValidationError('Booking ID is required');
    }

    const gateway = requirePaymentGateway();

    // 1. Fetch booking with vehicle details
    const [bookings] = await query(`
      SELECT b.id, b.userEmail, b.VehicleId, b.FromDate, b.ToDate, b.Status,
             v.PricePerDay, v.VehiclesTitle
      FROM tblbooking b
      JOIN tblvehicles v ON v.id = b.VehicleId
      WHERE b.id = ?
    `, [bookingId]);

    if (bookings.length === 0) {
      throw new NotFoundError('Booking');
    }
    const booking = bookings[0];

    // Ownership check
    if (booking.userEmail !== userEmail) {
      throw new ForbiddenError('You can only pay for your own booking');
    }

    // Must be confirmed by admin (Status === 1)
    if (booking.Status !== 1) {
      throw new ValidationError('Payment can only be made for confirmed bookings');
    }

    // 2. Compute exact rental amount server-side
    const { days, totalAmount } = computeRentalAmount(booking.FromDate, booking.ToDate, booking.PricePerDay);
    const amountInPaise = Math.round(totalAmount * 100);

    const bookingSummary = {
      bookingId: booking.id,
      vehicleTitle: booking.VehiclesTitle,
      fromDate: booking.FromDate,
      toDate: booking.ToDate,
      days,
      pricePerDay: booking.PricePerDay,
      totalAmount,
    };

    return withTransaction(async (conn) => {
      const [existing] = await conn.execute(
        'SELECT id, amount, gateway, gateway_order_id, payment_status FROM tblpayments WHERE booking_id = ? FOR UPDATE',
        [bookingId]
      );

      if (existing.length > 0) {
        const paymentRow = existing[0];
        if (paymentRow.payment_status === 'confirmed') {
          throw new ConflictError('Payment for this booking is already confirmed');
        }

        // Reuse existing pending order if gateway matches, orderId exists, and amount is identical
        if (
          paymentRow.gateway === gateway.name &&
          paymentRow.gateway_order_id &&
          Math.abs(Number(paymentRow.amount) - totalAmount) < 0.01 &&
          paymentRow.payment_status === 'pending'
        ) {
          return {
            gateway: gateway.name,
            keyId: gateway.publicKeyId,
            orderId: paymentRow.gateway_order_id,
            amount: amountInPaise,
            currency: 'INR',
            bookingSummary,
          };
        }
      }

      // 3. Create fresh order with the gateway
      const order = await gateway.createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `bkg_${booking.id}`,
        notes: {
          bookingId: String(booking.id),
          userEmail: booking.userEmail,
        },
      });

      if (existing.length > 0) {
        await conn.execute(`
          UPDATE tblpayments
          SET gateway = ?, gateway_order_id = ?, amount = ?, currency = 'INR',
              payment_status = 'pending', payment_date = NOW(), transaction_id = NULL
          WHERE id = ?
        `, [gateway.name, order.id, totalAmount, existing[0].id]);
      } else {
        await conn.execute(`
          INSERT INTO tblpayments (booking_id, gateway, gateway_order_id, amount, currency, payment_status, payment_date)
          VALUES (?, ?, ?, ?, 'INR', 'pending', NOW())
        `, [booking.id, gateway.name, order.id, totalAmount]);
      }

      auditLog('PAYMENT_ORDER_CREATED', {
        actorType: 'customer',
        actorId: userEmail,
        details: {
          bookingId: booking.id,
          orderId: order.id,
          amount: amountInPaise,
          gateway: gateway.name,
        },
      });

      return {
        gateway: gateway.name,
        keyId: gateway.publicKeyId,
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        bookingSummary,
      };
    });
  }

  /**
   * Verify an online payment using cryptographic signature + server-side gateway fetch.
   */
  async verifyPayment({ bookingId, orderId, paymentId, signature, userEmail }) {
    if (!bookingId || !orderId || !paymentId || !signature) {
      throw new ValidationError('Missing required payment verification parameters');
    }

    const gateway = requirePaymentGateway();

    // 1. Verify booking ownership
    const [bookings] = await query(`
      SELECT b.id, b.userEmail, b.VehicleId, b.FromDate, b.ToDate, b.Status,
             v.PricePerDay, v.VehiclesTitle
      FROM tblbooking b
      JOIN tblvehicles v ON v.id = b.VehicleId
      WHERE b.id = ?
    `, [bookingId]);

    if (bookings.length === 0) throw new NotFoundError('Booking');
    const booking = bookings[0];

    if (booking.userEmail !== userEmail) {
      throw new ForbiddenError('You can only verify payment for your own booking');
    }

    const { totalAmount } = computeRentalAmount(booking.FromDate, booking.ToDate, booking.PricePerDay);
    const expectedAmountInPaise = Math.round(totalAmount * 100);

    // 2. Cryptographic signature verification
    const isValidSignature = gateway.verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValidSignature) {
      throw new ValidationError('Invalid payment signature');
    }

    // 3. Server-side payment fetch from gateway to verify amount & status
    const paymentDetails = await gateway.fetchPayment(paymentId);
    if (!paymentDetails) {
      throw new ValidationError('Unable to fetch payment details from gateway');
    }

    if (paymentDetails.order_id && paymentDetails.order_id !== orderId) {
      throw new ValidationError('Payment order ID does not match');
    }

    if (paymentDetails.amount && Number(paymentDetails.amount) !== expectedAmountInPaise) {
      throw new ValidationError('Payment amount does not match booking charge');
    }

    if (paymentDetails.currency && paymentDetails.currency !== 'INR') {
      throw new ValidationError('Payment currency mismatch');
    }

    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      throw new ValidationError(`Payment status is ${paymentDetails.status}; expected captured`);
    }

    // 4. Update payment in transaction with lock
    return withTransaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT id, payment_status, gateway_order_id FROM tblpayments WHERE booking_id = ? FOR UPDATE',
        [bookingId]
      );

      if (rows.length === 0) {
        throw new NotFoundError('Payment record');
      }

      const paymentRecord = rows[0];

      // Idempotency: if already confirmed, return success
      if (paymentRecord.payment_status === 'confirmed') {
        return {
          success: true,
          message: 'Payment already confirmed',
          bookingId,
          receiptUrl: `/my-booking?receipt=${bookingId}`,
        };
      }

      const method = paymentDetails.method || (gateway.name === 'mock' ? 'mock_upi' : 'online');

      await conn.execute(`
        UPDATE tblpayments
        SET payment_status = 'confirmed',
            gateway = ?,
            gateway_order_id = ?,
            gateway_payment_id = ?,
            gateway_signature = ?,
            payment_method = ?,
            confirmation_date = NOW(),
            notes = ?
        WHERE id = ?
      `, [
        gateway.name,
        orderId,
        paymentId,
        signature,
        method,
        JSON.stringify(paymentDetails),
        paymentRecord.id,
      ]);

      auditLog('PAYMENT_CONFIRMED', {
        actorType: 'customer',
        actorId: userEmail,
        details: {
          bookingId,
          orderId,
          paymentId,
          method,
          gateway: gateway.name,
        },
      });

      return {
        success: true,
        message: 'Payment verified and confirmed successfully',
        bookingId,
        receiptUrl: `/my-booking?receipt=${bookingId}`,
      };
    });
  }

  /**
   * Handle incoming gateway webhooks.
   * Verifies signature, deduplicates event_id, idempotent order updates, non-downgrading.
   */
  async handleWebhook({ rawBody, headers }) {
    const gateway = requirePaymentGateway();

    const signature = headers['x-razorpay-signature'] || headers['x-mock-signature'];
    if (!signature) {
      throw new ValidationError('Missing webhook signature header');
    }

    const isValid = gateway.verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      throw new ValidationError('Invalid webhook signature');
    }

    const event = gateway.parseWebhookEvent(rawBody);
    if (!event || !event.eventId) {
      throw new ValidationError('Malformed webhook event');
    }

    return withTransaction(async (conn) => {
      // 1. Deduplicate event id
      const [existingEvents] = await conn.execute(
        'SELECT id FROM tbl_payment_events WHERE event_id = ? FOR UPDATE',
        [event.eventId]
      );

      if (existingEvents.length > 0) {
        return { received: true, duplicate: true };
      }

      // Record event
      await conn.execute(`
        INSERT INTO tbl_payment_events (event_id, event_type, gateway, payload)
        VALUES (?, ?, ?, ?)
      `, [
        event.eventId,
        event.type || 'unknown',
        gateway.name,
        Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody),
      ]);

      // 2. Process event types
      if (event.type === 'payment.captured' || event.type === 'order.paid') {
        const orderId = event.orderId;
        const paymentId = event.paymentId;
        const method = event.method || (gateway.name === 'mock' ? 'mock_webhook' : 'online');

        if (orderId) {
          const [payments] = await conn.execute(
            'SELECT id, payment_status, booking_id FROM tblpayments WHERE gateway_order_id = ? FOR UPDATE',
            [orderId]
          );

          if (payments.length > 0) {
            const p = payments[0];
            if (p.payment_status !== 'confirmed') {
              await conn.execute(`
                UPDATE tblpayments
                SET payment_status = 'confirmed',
                    gateway_payment_id = COALESCE(?, gateway_payment_id),
                    payment_method = COALESCE(?, payment_method),
                    confirmation_date = NOW()
                WHERE id = ?
              `, [paymentId || null, method, p.id]);

              auditLog('PAYMENT_WEBHOOK_CONFIRMED', {
                actorType: 'webhook',
                actorId: gateway.name,
                details: { eventId: event.eventId, orderId, paymentId, bookingId: p.booking_id },
              });
            }
          }
        }
      } else if (event.type === 'payment.failed') {
        const orderId = event.orderId;
        if (orderId) {
          const [payments] = await conn.execute(
            'SELECT id, payment_status, booking_id FROM tblpayments WHERE gateway_order_id = ? FOR UPDATE',
            [orderId]
          );

          if (payments.length > 0) {
            const p = payments[0];
            // CRITICAL: NEVER downgrade confirmed payment to failed
            if (p.payment_status === 'pending') {
              await conn.execute(
                "UPDATE tblpayments SET payment_status = 'failed' WHERE id = ?",
                [p.id]
              );

              auditLog('PAYMENT_WEBHOOK_FAILED', {
                actorType: 'webhook',
                actorId: gateway.name,
                details: { eventId: event.eventId, orderId, bookingId: p.booking_id },
              });
            }
          }
        }
      } else if (event.type === 'refund.processed') {
        const orderId = event.orderId;
        const paymentId = event.paymentId;

        const [payments] = await conn.execute(
          'SELECT id, payment_status, booking_id FROM tblpayments WHERE gateway_payment_id = ? OR gateway_order_id = ? FOR UPDATE',
          [paymentId || '', orderId || '']
        );

        if (payments.length > 0) {
          const p = payments[0];
          await conn.execute(
            "UPDATE tblpayments SET payment_status = 'refunded' WHERE id = ?",
            [p.id]
          );

          auditLog('PAYMENT_WEBHOOK_REFUNDED', {
            actorType: 'webhook',
            actorId: gateway.name,
            details: { eventId: event.eventId, orderId, paymentId, bookingId: p.booking_id },
          });
        }
      }

      return { received: true };
    });
  }

  /**
   * Get payment status for a booking (polling support).
   */
  async getStatus(bookingId, currentUser) {
    const [bookings] = await query(
      'SELECT id, userEmail FROM tblbooking WHERE id = ?',
      [bookingId]
    );

    if (bookings.length === 0) {
      throw new NotFoundError('Booking');
    }
    const booking = bookings[0];

    // Ownership check (IDOR fix)
    if (currentUser.role !== 'admin' && booking.userEmail !== currentUser.email) {
      throw new ForbiddenError('You do not have permission to view payment status for this booking');
    }

    const [rows] = await query(
      'SELECT * FROM tblpayments WHERE booking_id = ? ORDER BY id DESC LIMIT 1',
      [bookingId]
    );

    if (rows.length === 0) {
      return { status: 'unpaid', bookingId };
    }

    const payment = rows[0];
    return {
      bookingId,
      status: payment.payment_status,
      gateway: payment.gateway,
      orderId: payment.gateway_order_id,
      paymentId: payment.gateway_payment_id,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      confirmationDate: payment.confirmation_date,
    };
  }

  /**
   * Admin: Reconcile pending payment with the gateway.
   */
  async adminReconcile(paymentId) {
    const [rows] = await query(
      'SELECT * FROM tblpayments WHERE id = ?',
      [paymentId]
    );

    if (rows.length === 0) {
      throw new NotFoundError('Payment');
    }
    const payment = rows[0];

    if (payment.payment_status !== 'pending') {
      return {
        success: false,
        message: `Payment is already ${payment.payment_status}`,
        payment_status: payment.payment_status,
      };
    }

    if (!payment.gateway || payment.gateway === 'manual') {
      return {
        success: false,
        message: 'Cannot reconcile manual payment via online gateway',
        payment_status: payment.payment_status,
      };
    }

    const gateway = requirePaymentGateway();
    let fetched = null;

    if (payment.gateway_payment_id) {
      try {
        fetched = await gateway.fetchPayment(payment.gateway_payment_id);
      } catch (err) {
        // Continue
      }
    }

    if (fetched && (fetched.status === 'captured' || fetched.status === 'authorized')) {
      await query(`
        UPDATE tblpayments
        SET payment_status = 'confirmed',
            confirmation_date = NOW(),
            payment_method = COALESCE(?, payment_method)
        WHERE id = ?
      `, [fetched.method || 'online', payment.id]);

      auditLog('PAYMENT_ADMIN_RECONCILED', {
        actorType: 'admin',
        actorId: 'admin',
        details: { paymentId: payment.id, gateway: payment.gateway },
      });

      return {
        success: true,
        message: 'Payment successfully reconciled and confirmed',
        payment_status: 'confirmed',
      };
    }

    return {
      success: false,
      message: 'Gateway reports payment is not yet captured',
      payment_status: payment.payment_status,
    };
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
        p.gateway,
        p.gateway_order_id,
        p.gateway_payment_id,
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
        paymentMethod: receipt.payment_method || (receipt.gateway ? `${receipt.gateway}_online` : 'Manual'),
        transactionId: receipt.gateway_payment_id || receipt.transaction_id || 'N/A',
        gateway: receipt.gateway || 'manual',
        gatewayOrderId: receipt.gateway_order_id || null,
        gatewayPaymentId: receipt.gateway_payment_id || null,
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
    auditLog('PAYMENT_CONFIRMED', {
      actorType: 'admin',
      actorId: 'admin',
      details: { paymentId },
    });
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
    auditLog('PAYMENT_REJECTED', {
      actorType: 'admin',
      actorId: 'admin',
      details: { paymentId },
    });
    return { success: true, message: 'Payment Rejected Successfully' };
  }
}

module.exports = new PaymentsService();