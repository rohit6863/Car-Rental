'use strict';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { signAccessToken } = require('../src/utils/jwt');
const { generateCsrfToken } = require('../src/middleware/csrf');

describe('Booking Race & Atomic Transaction Tests', () => {
  const csrfNonce = 'test_nonce_booking_123';
  const csrfToken = generateCsrfToken(csrfNonce);

  let adminToken;
  let userToken;
  let testBrandId;
  let vehicleId;
  let bookingId1;
  let bookingId2;

  beforeAll(async () => {
    // Generate auth tokens
    adminToken = signAccessToken({ id: 9999, username: 'admin', role: 'admin' });
    userToken = signAccessToken({ id: 8888, email: 'booker@example.com', role: 'user' });

    // Seed test brand & vehicle
    const [bRes] = await pool.query('INSERT INTO tblbrands (BrandName) VALUES (?)', ['RaceTestBrand']);
    testBrandId = bRes.insertId;

    const [vRes] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', 1)
    `, ['RaceCar', testBrandId, 'Overview', 2000, 'Petrol', 2024, 4]);
    vehicleId = vRes.insertId;

    // Seed User
    await pool.query(
      'INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)',
      ['Booker User', 'booker@example.com', '9876543210', 'password']
    );

    // Create 2 conflicting pending bookings for the SAME dates
    const [bk1] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, '2026-12-01', '2026-12-05', 'Booking 1', 0)
    `, ['booker@example.com', vehicleId]);
    bookingId1 = bk1.insertId;

    const [bk2] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, '2026-12-03', '2026-12-07', 'Booking 2', 0)
    `, ['booker@example.com', vehicleId]);
    bookingId2 = bk2.insertId;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM tblbooking WHERE VehicleId = ?', [vehicleId]);
    await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    await pool.query('DELETE FROM tblbrands WHERE id = ?', [testBrandId]);
    await pool.query('DELETE FROM tblusers WHERE EmailId = ?', ['booker@example.com']);
    await pool.end();
  });

  it('atomically confirms booking 1 and marks vehicle as Rented', async () => {
    const res = await request(app)
      .patch(`/api/admin/bookings/${bookingId1}/confirm`)
      .set('Cookie', [`access_token=${adminToken}`, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Check DB: tblbooking.Status=1 and tblvehicles.vehicle_status='Rented'
    const [bk] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [bookingId1]);
    expect(bk[0].Status).toBe(1);

    const [v] = await pool.query('SELECT vehicle_status FROM tblvehicles WHERE id = ?', [vehicleId]);
    expect(v[0].vehicle_status).toBe('Rented');
  });

  it('rejects confirmation of overlapping booking 2 with clear conflict error', async () => {
    // Attempting to confirm booking 2 (which overlaps booking 1) must be rejected
    const res = await request(app)
      .patch(`/api/admin/bookings/${bookingId2}/confirm`)
      .set('Cookie', [`access_token=${adminToken}`, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already booked for overlapping dates/i);

    // Verify booking 2 remained unconfirmed (Status = 0)
    const [bk] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [bookingId2]);
    expect(bk[0].Status).toBe(0);
  });

  it('atomically cancels booking 1 and reverts vehicle to Available', async () => {
    const res = await request(app)
      .patch(`/api/admin/bookings/${bookingId1}/cancel`)
      .set('Cookie', [`access_token=${adminToken}`, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Check DB: tblbooking.Status=2 and tblvehicles.vehicle_status='Available'
    const [bk] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [bookingId1]);
    expect(bk[0].Status).toBe(2);

    const [v] = await pool.query('SELECT vehicle_status FROM tblvehicles WHERE id = ?', [vehicleId]);
    expect(v[0].vehicle_status).toBe('Available');
  });
});
