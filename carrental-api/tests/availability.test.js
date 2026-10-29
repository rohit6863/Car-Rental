'use strict';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { countDaysInclusive, computeRentalAmount } = require('../src/utils/dates');
const { generateCsrfToken } = require('../src/middleware/csrf');

describe('Availability & Date Calculation Tests', () => {
  const csrfNonce = 'test_nonce_avail_123';
  const csrfToken = generateCsrfToken(csrfNonce);

  let vehicleId;
  let testBrandId;

  beforeAll(async () => {
    // Insert test brand and vehicle
    const [bRes] = await pool.query('INSERT INTO tblbrands (BrandName) VALUES (?)', ['TestBrandAvailability']);
    testBrandId = bRes.insertId;

    const [vRes] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', 1)
    `, ['TestCarAvailability', testBrandId, 'Overview', 1000, 'Petrol', 2024, 4]);
    vehicleId = vRes.insertId;

    // Seed a confirmed booking for 2026-11-10 to 2026-11-15 (inclusive: 6 days)
    await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, ?, ?, ?, 1)
    `, ['user1@example.com', vehicleId, '2026-11-10', '2026-11-15', 'Confirmed Booking']);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM tblbooking WHERE VehicleId = ?', [vehicleId]);
    await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    await pool.query('DELETE FROM tblbrands WHERE id = ?', [testBrandId]);
    await pool.end();
  });

  describe('Standardized Inclusive Day Count Formula', () => {
    it('calculates days inclusively (end - start + 1)', () => {
      // 2026-11-10 to 2026-11-10 = 1 day
      expect(countDaysInclusive('2026-11-10', '2026-11-10')).toBe(1);

      // 2026-11-10 to 2026-11-12 = 3 days (10th, 11th, 12th)
      expect(countDaysInclusive('2026-11-10', '2026-11-12')).toBe(3);

      // 2026-11-10 to 2026-11-15 = 6 days
      expect(countDaysInclusive('2026-11-10', '2026-11-15')).toBe(6);
    });

    it('computes rental amount correctly server-side from price per day', () => {
      const calc = computeRentalAmount('2026-11-10', '2026-11-12', 1500);
      expect(calc.days).toBe(3);
      expect(calc.totalAmount).toBe(4500);
    });
  });

  describe('GET /api/vehicles/:id/booked-dates', () => {
    it('returns all disabled dates for confirmed bookings', async () => {
      const res = await request(app).get(`/api/vehicles/${vehicleId}/booked-dates`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booked_dates).toContain('2026-11-10');
      expect(res.body.booked_dates).toContain('2026-11-12');
      expect(res.body.booked_dates).toContain('2026-11-15');
      expect(res.body.booked_dates).not.toContain('2026-11-09');
      expect(res.body.booked_dates).not.toContain('2026-11-16');
    });
  });

  describe('POST /api/vehicles/check-availability', () => {
    it('reports vehicle unavailable when dates overlap with confirmed booking', async () => {
      // Overlaps 2026-11-10 to 2026-11-15
      const res = await request(app)
        .post('/api/vehicles/check-availability')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          vehicle_id: vehicleId,
          from_date: '2026-11-12',
          to_date: '2026-11-18',
        });

      expect(res.status).toBe(200);
      expect(res.body.available).toBe(false);
      expect(res.body.message).toMatch(/not available/i);
    });

    it('reports vehicle available when dates do not overlap', async () => {
      const res = await request(app)
        .post('/api/vehicles/check-availability')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          vehicle_id: vehicleId,
          from_date: '2026-11-20',
          to_date: '2026-11-25',
        });

      expect(res.status).toBe(200);
      expect(res.body.available).toBe(true);
      expect(res.body.message).toMatch(/available/i);
    });
  });
});
