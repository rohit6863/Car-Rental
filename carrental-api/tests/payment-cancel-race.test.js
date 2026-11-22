'use strict';

const { pool } = require('../src/db/pool');
const paymentsService = require('../src/services/payments.service');
const bookingsService = require('../src/services/bookings.service');
const crypto = require('crypto');
const {
  MockGateway,
  setGatewayForTesting,
  resetGatewayForTesting,
} = require('../src/services/payment');

describe('Payment vs Booking Cancellation Race Conditions', () => {
  const testUserEmail = 'race_user_test@example.com';
  let vehicleId;
  let testBookingId1;
  let testBookingId2;
  let testBookingId3;
  let mockGw;

  beforeAll(async () => {
    mockGw = new MockGateway();
    setGatewayForTesting(mockGw);

    // 1. Ensure test vehicle exists
    const [brands] = await pool.query('SELECT id FROM tblbrands LIMIT 1');
    const brandId = brands[0]?.id || 1;

    const [vRes] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status)
      VALUES ('Race Test Car', ?, 2000, 'Petrol', 2024, 5, 'Available')
    `, [brandId]);
    vehicleId = vRes.insertId;

    // 2. Ensure test user exists
    await pool.query(`
      INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
      VALUES ('Race Test User', ?, '9876543210', '', '$argon2id$v=19$m=65536,t=3,p=4$dummyhash')
      ON DUPLICATE KEY UPDATE FullName = VALUES(FullName)
    `, [testUserEmail]);
  });

  afterAll(async () => {
    resetGatewayForTesting();
    if (vehicleId) {
      await pool.query('DELETE FROM tblpayments WHERE booking_id IN (?, ?, ?)', [testBookingId1 || 0, testBookingId2 || 0, testBookingId3 || 0]);
      await pool.query('DELETE FROM tblbooking WHERE VehicleId = ?', [vehicleId]);
      await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    }
    await pool.query('DELETE FROM tblusers WHERE EmailId = ?', [testUserEmail]);
    await pool.end();
  });

  test('1. Webhook race: late captured webhook on cancelled booking flags payment as needs_refund', async () => {
    // Create and confirm booking
    const bkg = await bookingsService.createBooking({
      userEmail: testUserEmail,
      vehicle_id: vehicleId,
      fromdate: '2026-12-01',
      todate: '2026-12-03',
      message: 'Race test 1',
    });
    testBookingId1 = bkg.id;
    await bookingsService.adminConfirm(testBookingId1);

    // Create payment order
    const orderRes = await paymentsService.createOrder({
      bookingId: testBookingId1,
      userEmail: testUserEmail,
    });
    const orderId = orderRes.orderId;

    // Simulate customer cancelling booking while payment was in flight
    await bookingsService.userCancel(testBookingId1, testUserEmail);

    // Verify order was invalidated
    const [pBefore] = await pool.query('SELECT payment_status FROM tblpayments WHERE gateway_order_id = ?', [orderId]);
    expect(pBefore[0].payment_status).toBe('failed');

    // Simulate incoming webhook from gateway: payment.captured
    const mockPaymentId = `pay_mock_${Date.now()}`;
    const rawPayload = JSON.stringify({
      id: `evt_mock_${Date.now()}`,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: orderId,
            status: 'captured',
            amount: orderRes.amount,
            currency: 'INR',
            method: 'mock_card',
          },
        },
      },
    });

    const sig = mockGw.signWebhook(rawPayload);

    const webhookResult = await paymentsService.handleWebhook({
      rawBody: Buffer.from(rawPayload),
      headers: {
        'x-mock-signature': sig,
      },
    });

    expect(webhookResult.received).toBe(true);

    // Check payment row in DB
    const [pAfter] = await pool.query('SELECT * FROM tblpayments WHERE gateway_order_id = ?', [orderId]);
    expect(pAfter[0].payment_status).toBe('needs_refund');
    expect(pAfter[0].failure_reason).toContain('Payment captured via webhook after booking was cancelled');

    // Check booking row in DB: still cancelled (Status === 2)
    const [bAfter] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [testBookingId1]);
    expect(bAfter[0].Status).toBe(2);
  });

  test('2. Admin cancel of already paid booking: updates payment to needs_refund', async () => {
    // Create and confirm booking
    const bkg = await bookingsService.createBooking({
      userEmail: testUserEmail,
      vehicle_id: vehicleId,
      fromdate: '2026-12-05',
      todate: '2026-12-07',
      message: 'Race test 2',
    });
    testBookingId2 = bkg.id;
    await bookingsService.adminConfirm(testBookingId2);

    // Create payment order and confirm payment
    const orderRes = await paymentsService.createOrder({
      bookingId: testBookingId2,
      userEmail: testUserEmail,
    });
    const orderId = orderRes.orderId;

    // Simulate valid verification
    const sim = mockGw.simulateSuccess({ orderId, method: 'mock_card' });

    const verifyRes = await paymentsService.verifyPayment({
      bookingId: testBookingId2,
      orderId,
      paymentId: sim.paymentId,
      signature: sim.signature,
      userEmail: testUserEmail,
    });
    expect(verifyRes.success).toBe(true);

    const [pPaid] = await pool.query('SELECT payment_status FROM tblpayments WHERE gateway_order_id = ?', [orderId]);
    expect(pPaid[0].payment_status).toBe('confirmed');

    // Now admin cancels this paid booking
    const cancelRes = await bookingsService.adminCancel(testBookingId2);
    expect(cancelRes.success).toBe(true);

    // Payment must NOT be left as confirmed; must be flagged as needs_refund
    const [pAfterCancel] = await pool.query('SELECT payment_status, failure_reason FROM tblpayments WHERE gateway_order_id = ?', [orderId]);
    expect(pAfterCancel[0].payment_status).toBe('needs_refund');
    expect(pAfterCancel[0].failure_reason).toContain('Booking cancelled by admin after payment');

    // Booking must be cancelled
    const [bAfterCancel] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [testBookingId2]);
    expect(bAfterCancel[0].Status).toBe(2);
  });

  test('3. Customer verify race: cancel occurs before verify finishes -> flags payment as needs_refund', async () => {
    // Create and confirm booking
    const bkg = await bookingsService.createBooking({
      userEmail: testUserEmail,
      vehicle_id: vehicleId,
      fromdate: '2026-12-10',
      todate: '2026-12-12',
      message: 'Race test 3',
    });
    testBookingId3 = bkg.id;
    await bookingsService.adminConfirm(testBookingId3);

    // Create payment order
    const orderRes = await paymentsService.createOrder({
      bookingId: testBookingId3,
      userEmail: testUserEmail,
    });
    const orderId = orderRes.orderId;

    // Booking cancelled before verify request arrives
    await bookingsService.userCancel(testBookingId3, testUserEmail);

    const sim = mockGw.simulateSuccess({ orderId, method: 'mock_card' });

    const verifyRes = await paymentsService.verifyPayment({
      bookingId: testBookingId3,
      orderId,
      paymentId: sim.paymentId,
      signature: sim.signature,
      userEmail: testUserEmail,
    });

    expect(verifyRes.success).toBe(false);
    expect(verifyRes.status).toBe('needs_refund');

    const [pFinal] = await pool.query('SELECT payment_status, failure_reason FROM tblpayments WHERE gateway_order_id = ?', [orderId]);
    expect(pFinal[0].payment_status).toBe('needs_refund');
    expect(pFinal[0].failure_reason).toContain('Payment captured after booking was cancelled');
  });
});
