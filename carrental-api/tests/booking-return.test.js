'use strict';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { signAccessToken } = require('../src/utils/jwt');
const { generateCsrfToken } = require('../src/middleware/csrf');

describe('Admin Vehicle Return Confirmation (PATCH /api/admin/bookings/:id/return)', () => {
  const csrfNonce = 'test_nonce_booking_return_123';
  const csrfToken = generateCsrfToken(csrfNonce);

  let brandId;
  let vehicleId;
  let userId;
  let pendingBookingId;
  let cancelledBookingId;
  let confirmedBooking1Id;
  let confirmedBooking2Id;
  let userToken;
  let adminToken;
  const userEmail = `return_driver_${Date.now()}@example.com`;

  const adminCookies = () => [
    `admin_access_token=${adminToken}`,
    `csrf_nonce=${csrfNonce}`,
  ];
  const userCookies = () => [
    `access_token=${userToken}`,
    `csrf_nonce=${csrfNonce}`,
  ];

  beforeAll(async () => {
    const [bRes] = await pool.query('INSERT INTO tblbrands (BrandName) VALUES (?)', [`ReturnBrand_${Date.now()}`]);
    brandId = bRes.insertId;

    const [uRes] = await pool.query(
      'INSERT INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)',
      ['Return Test Driver', userEmail, '9876543219', 'hash']
    );
    userId = uRes.insertId;

    const [vRes] = await pool.query(
      `INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, OdometerKm, vehicle_status, Status)
       VALUES ('ReturnSedan', ?, 'Return test car', 3000, 'Petrol', 2024, 5, 10000, 'Rented', 1)`,
      [brandId]
    );
    vehicleId = vRes.insertId;

    const [bkPending] = await pool.query(
      `INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
       VALUES (?, ?, '2026-12-01', '2026-12-02', 'Pending test', 0)`,
      [userEmail, vehicleId]
    );
    pendingBookingId = bkPending.insertId;

    const [bkCancelled] = await pool.query(
      `INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
       VALUES (?, ?, '2026-12-03', '2026-12-04', 'Cancelled test', 2)`,
      [userEmail, vehicleId]
    );
    cancelledBookingId = bkCancelled.insertId;

    const [bkConf1] = await pool.query(
      `INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
       VALUES (?, ?, '2026-12-05', '2026-12-06', 'Confirmed 1', 1)`,
      [userEmail, vehicleId]
    );
    confirmedBooking1Id = bkConf1.insertId;

    const [bkConf2] = await pool.query(
      `INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
       VALUES (?, ?, '2026-12-08', '2026-12-09', 'Confirmed 2', 1)`,
      [userEmail, vehicleId]
    );
    confirmedBooking2Id = bkConf2.insertId;

    userToken = signAccessToken({ id: userId, email: userEmail, role: 'user' });
    adminToken = signAccessToken({ id: 9201, username: 'admin', role: 'admin' });
  });

  afterAll(async () => {
    await pool.query(
      'DELETE FROM tblbooking WHERE id IN (?, ?, ?, ?)',
      [pendingBookingId, cancelledBookingId, confirmedBooking1Id, confirmedBooking2Id]
    );
    if (vehicleId) await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    if (userId) await pool.query('DELETE FROM tblusers WHERE id = ?', [userId]);
    if (brandId) await pool.query('DELETE FROM tblbrands WHERE id = ?', [brandId]);
    await pool.end();
  });

  it('rejects return on Pending (Status=0) and Cancelled (Status=2) bookings', async () => {
    const resPending = await request(app)
      .patch(`/api/admin/bookings/${pendingBookingId}/return`)
      .set('Cookie', adminCookies())
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(resPending.status).toBe(422);

    const resCancelled = await request(app)
      .patch(`/api/admin/bookings/${cancelledBookingId}/return`)
      .set('Cookie', adminCookies())
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(resCancelled.status).toBe(422);
  });

  it('confirms return with explicit returnedAt, returnOdometerKm, and returnNotes, and marks vehicle Available', async () => {
    const explicitIso = '2026-12-06T16:15:00.000Z';
    const res = await request(app)
      .patch(`/api/admin/bookings/${confirmedBooking1Id}/return`)
      .set('Cookie', adminCookies())
      .set('x-csrf-token', csrfToken)
      .send({
        returnedAt: explicitIso,
        returnOdometerKm: 10450,
        returnNotes: 'Clean interior, full fuel tank',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.returnOdometerKm).toBe(10450);
    expect(res.body.returnNotes).toBe('Clean interior, full fuel tank');

    const [vRows] = await pool.query(
      'SELECT vehicle_status, OdometerKm FROM tblvehicles WHERE id = ?',
      [vehicleId]
    );
    expect(vRows[0].vehicle_status).toBe('Available');
    expect(vRows[0].OdometerKm).toBe(10450);

    const [bkRows] = await pool.query(
      'SELECT ReturnedAt, ReturnOdometerKm, ReturnNotes FROM tblbooking WHERE id = ?',
      [confirmedBooking1Id]
    );
    expect(bkRows[0].ReturnedAt).toBeTruthy();
    expect(bkRows[0].ReturnOdometerKm).toBe(10450);
    expect(bkRows[0].ReturnNotes).toBe('Clean interior, full fuel tank');
  });

  it('rejects returning an already-returned booking with 409', async () => {
    const res = await request(app)
      .patch(`/api/admin/bookings/${confirmedBooking1Id}/return`)
      .set('Cookie', adminCookies())
      .set('x-csrf-token', csrfToken)
      .send({});
    expect(res.status).toBe(409);
  });

  it('defaults returnedAt to current time when omitted and surfaces return fields in admin & customer listings', async () => {
    const res = await request(app)
      .patch(`/api/admin/bookings/${confirmedBooking2Id}/return`)
      .set('Cookie', adminCookies())
      .set('x-csrf-token', csrfToken)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.returnedAt).toBeTruthy();

    const adminList = await request(app)
      .get('/api/admin/bookings')
      .set('Cookie', adminCookies());
    expect(adminList.status).toBe(200);
    const adminItem = adminList.body.find((b) => b.id === confirmedBooking2Id);
    expect(adminItem).toBeDefined();
    expect(adminItem.ReturnedAt).toBeTruthy();

    const customerList = await request(app)
      .get('/api/bookings/my')
      .set('Cookie', userCookies());
    expect(customerList.status).toBe(200);
    const custItem = customerList.body.find((b) => b.bookingId === confirmedBooking1Id);
    expect(custItem).toBeDefined();
    expect(custItem.ReturnedAt).toBeTruthy();
    expect(custItem.ReturnOdometerKm).toBe(10450);
  });
});
