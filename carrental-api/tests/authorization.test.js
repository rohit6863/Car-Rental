'use strict';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { signAccessToken } = require('../src/utils/jwt');
const { generateCsrfToken } = require('../src/middleware/csrf');

describe('Authorization, IDOR, CSRF & Server-Side Calculation', () => {
  const csrfNonce = 'test_nonce_authz_123';
  const csrfToken = generateCsrfToken(csrfNonce);

  let user1Token;
  let user2Token;
  let adminToken;
  let vehicleId;
  let bookingIdUser1;

  beforeAll(async () => {
    user1Token = signAccessToken({ id: 101, email: 'alice@example.com', role: 'user' });
    user2Token = signAccessToken({ id: 102, email: 'bob@example.com', role: 'user' });
    adminToken = signAccessToken({ id: 999, username: 'admin', role: 'admin' });

    // Seed users
    await pool.query('INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)', ['Alice', 'alice@example.com', '9999911111', 'hash']);
    await pool.query('INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)', ['Bob', 'bob@example.com', '9999922222', 'hash']);

    // Seed vehicle ($1,000 / day)
    const [v] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
      VALUES ('AuthzCar', 1, 'Overview', 1000, 'Petrol', 2024, 4, 'Available', 1)
    `);
    vehicleId = v.insertId;

    // Seed confirmed booking for Alice (2026-12-10 to 2026-12-12 = 3 days, total = 3000)
    const [bk] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES ('alice@example.com', ?, '2026-12-10', '2026-12-12', 'Alice booking', 1)
    `, [vehicleId]);
    bookingIdUser1 = bk.insertId;

    // Seed confirmed payment for Alice's booking
    await pool.query(`
      INSERT INTO tblpayments (booking_id, amount, payment_method, transaction_id, payment_status)
      VALUES (?, 3000, 'UPI', 'TXN_ALICE_123', 'confirmed')
    `, [bookingIdUser1]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM tblpayments WHERE booking_id = ?', [bookingIdUser1]);
    await pool.query('DELETE FROM tblbooking WHERE id = ?', [bookingIdUser1]);
    await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    await pool.query('DELETE FROM tblusers WHERE EmailId IN (?, ?)', ['alice@example.com', 'bob@example.com']);
    await pool.end();
  });

  describe('Role-based Access Control', () => {
    it('blocks regular users from accessing admin routes with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/bookings')
        .set('Cookie', [`access_token=${user1Token}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/admin access required/i);
    });

    it('allows admin to access admin routes', async () => {
      const res = await request(app)
        .get('/api/admin/bookings')
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('IDOR Protection on Receipts', () => {
    it('allows Alice to view her own confirmed receipt', async () => {
      const res = await request(app)
        .get(`/api/payments/receipt/${bookingIdUser1}`)
        .set('Cookie', [`access_token=${user1Token}`]);

      expect(res.status).toBe(200);
      expect(res.body.receiptNumber).toBe(`RCP${String(bookingIdUser1).padStart(6, '0')}`);
      expect(res.body.payment.totalAmount).toBe(3000);
    });

    it('denies Bob from viewing Alice’s receipt (IDOR blocked with 403)', async () => {
      const res = await request(app)
        .get(`/api/payments/receipt/${bookingIdUser1}`)
        .set('Cookie', [`access_token=${user2Token}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/permission/i);
    });

    it('allows Admin to view any receipt', async () => {
      const res = await request(app)
        .get(`/api/payments/receipt/${bookingIdUser1}`)
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.customer.email).toBe('alice@example.com');
    });
  });

  describe('CSRF & HTTP Method Constraints', () => {
    it('rejects state-changing requests without CSRF token', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .send({
          vehicle_id: vehicleId,
          fromdate: '2026-12-20',
          todate: '2026-12-22',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/csrf/i);
    });

    it('does NOT permit state changes over GET', async () => {
      // Trying GET /api/admin/bookings/1/confirm must result in 404
      const res = await request(app)
        .get(`/api/admin/bookings/${bookingIdUser1}/confirm`)
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(res.status).toBe(404);
    });
  });

  describe('Server-Side Payment Amount Calculation', () => {
    it('computes payment amount from booking dates x price per day, ignoring client-sent amount', async () => {
      // Create a pending booking for Alice: 2 days (2026-12-25 to 2026-12-26) @ 1000/day = 2000
      const [newBk] = await pool.query(`
        INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
        VALUES ('alice@example.com', ?, '2026-12-25', '2026-12-26', 'Calc test', 1)
      `, [vehicleId]);
      const calcBookingId = newBk.insertId;

      // Alice submits payment with tampered amount of 1 rupee
      const res = await request(app)
        .post('/api/payments')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          booking_id: calcBookingId,
          payment_method: 'UPI',
          transaction_id: 'TXN_TEST_999',
          amount: 1, // Tampered amount!
        });

      expect(res.status).toBe(200);
      expect(res.body.amount).toBe(2000); // Server calculated exact 2000

      // Verify in DB that amount stored is 2000.00
      const [payRows] = await pool.query('SELECT amount FROM tblpayments WHERE booking_id = ?', [calcBookingId]);
      expect(Number(payRows[0].amount)).toBe(2000);

      // Clean up
      await pool.query('DELETE FROM tblpayments WHERE booking_id = ?', [calcBookingId]);
      await pool.query('DELETE FROM tblbooking WHERE id = ?', [calcBookingId]);
    });
  });
});
