'use strict';
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { signAccessToken } = require('../src/utils/jwt');
const { generateCsrfToken } = require('../src/middleware/csrf');

describe('Fleet Ops Admin Endpoints', () => {
  const csrfNonce = 'test_nonce_fleetops_123';
  const csrfToken = generateCsrfToken(csrfNonce);

  let userToken;
  let adminToken;
  let brandId;
  let vehicleId;
  let userId;
  let bookingId;
  let paymentId;
  let createdMaintId;
  let createdNoteId;

  const authAdminCookies = () => [
    `access_token=${adminToken}`,
    `csrf_nonce=${csrfNonce}`,
  ];

  beforeAll(async () => {
    adminToken = signAccessToken({ id: 9001, username: 'admin', role: 'admin' });
    userToken = signAccessToken({ id: 9002, email: 'fleet_user@example.com', role: 'user' });

    const [bRes] = await pool.query(
      'INSERT INTO tblbrands (BrandName) VALUES (?)',
      ['FleetTestBrand_' + Date.now()]
    );
    brandId = bRes.insertId;

    const [uRes] = await pool.query(
      'INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, KycStatus) VALUES (?, ?, ?, ?, ?)',
      ['Fleet Driver', 'fleet_user@example.com', '9876543210', 'hash', 'Pending']
    );
    userId = uRes.insertId;

    const [vRes] = await pool.query(
      `INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, RegistrationPlate, HubLocation, OdometerKm, FuelChargePct, vehicle_status, Status)
       VALUES ('FleetEV', ?, 'Test EV vehicle', 5000, 'Electric', 2024, 5, 'MH 12 WW 7777', 'Pune Hub', 1200, 92, 'Available', 1)`,
      [brandId]
    );
    vehicleId = vRes.insertId;

    const [bkRes] = await pool.query(
      `INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
       VALUES ('fleet_user@example.com', ?, '2026-12-01', '2026-12-02', 'Fleet Ops test', 1)`,
      [vehicleId]
    );
    bookingId = bkRes.insertId;

    const [pRes] = await pool.query(
      `INSERT INTO tblpayments (booking_id, user_email, amount, currency, payment_method, transaction_id, payment_status, gateway)
       VALUES (?, 'fleet_user@example.com', 10000.00, 'INR', 'mock_upi', 'pay_fleet_test_1', 'confirmed', 'mock')`,
      [bookingId]
    );
    paymentId = pRes.insertId;
  });

  afterAll(async () => {
    if (createdMaintId) {
      await pool.query('DELETE FROM tblmaintenance WHERE id = ?', [createdMaintId]);
    }
    if (createdNoteId) {
      await pool.query('DELETE FROM tbladmin_notes WHERE id = ?', [createdNoteId]);
    }
    if (paymentId) await pool.query('DELETE FROM tblpayments WHERE id = ?', [paymentId]);
    if (bookingId) await pool.query('DELETE FROM tblbooking WHERE id = ?', [bookingId]);
    if (vehicleId) await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    if (userId) await pool.query('DELETE FROM tblusers WHERE id = ?', [userId]);
    if (brandId) await pool.query('DELETE FROM tblbrands WHERE id = ?', [brandId]);
    await pool.query(
      'UPDATE tblpricing_rules SET WeekendSurgeEnabled = 0, WeekendSurgePct = 15, HolidaySurgeEnabled = 0, HolidaySurgePct = 20 WHERE id = 1'
    );
    await pool.end();
  });

  describe('Auth & RBAC Protection', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/admin/analytics');
      expect(res.status).toBe(401);
    });

    it('rejects non-admin users with 403', async () => {
      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Cookie', [`access_token=${userToken}`]);
      expect(res.status).toBe(403);
    });
  });

  describe('Analytics & Alerts', () => {
    it('returns structured analytics and alerts for admin', async () => {
      const [analyticsRes, alertsRes] = await Promise.all([
        request(app).get('/api/admin/analytics?period=year').set('Cookie', [`access_token=${adminToken}`]),
        request(app).get('/api/admin/alerts').set('Cookie', [`access_token=${adminToken}`]),
      ]);

      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body).toHaveProperty('kpis');
      expect(analyticsRes.body).toHaveProperty('bookingHealth');
      expect(analyticsRes.body).toHaveProperty('readiness');
      expect(analyticsRes.body).toHaveProperty('topVehicles');
      expect(Array.isArray(analyticsRes.body.monthlySeries)).toBe(true);
      expect(analyticsRes.body.kpis.totalVehicles).toBeGreaterThanOrEqual(1);

      expect(alertsRes.status).toBe(200);
      expect(typeof alertsRes.body.totalCount).toBe('number');
      expect(Array.isArray(alertsRes.body.alerts)).toBe(true);
    });
  });

  describe('Maintenance CRUD', () => {
    it('validates body and supports create, list, update, delete', async () => {
      const invalidRes = await request(app)
        .post('/api/admin/maintenance')
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({ vehicleId, taskTitle: 'X', dueDate: 'invalid-date', estimatedCost: -5 });
      expect(invalidRes.status).toBe(422);

      const createRes = await request(app)
        .post('/api/admin/maintenance')
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({
          vehicleId,
          taskTitle: 'Battery Thermal Inspection',
          dueDate: '2026-12-15',
          estimatedCost: 4500,
          status: 'Scheduled',
        });
      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toBeTruthy();
      createdMaintId = createRes.body.id;

      const listRes = await request(app)
        .get('/api/admin/maintenance')
        .set('Cookie', [`access_token=${adminToken}`]);
      expect(listRes.status).toBe(200);
      expect(listRes.body.some((m) => m.id === createdMaintId)).toBe(true);

      const patchRes = await request(app)
        .patch(`/api/admin/maintenance/${createdMaintId}`)
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({ status: 'Completed' });
      expect(patchRes.status).toBe(200);

      const delRes = await request(app)
        .delete(`/api/admin/maintenance/${createdMaintId}`)
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken);
      expect(delRes.status).toBe(200);
      createdMaintId = null;
    });
  });

  describe('Dynamic Pricing & Notes & KYC & Telematics & GST Invoice', () => {
    it('updates and persists pricing rules', async () => {
      const badRes = await request(app)
        .put('/api/admin/pricing')
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({
          weekendSurgeEnabled: true,
          weekendSurgePct: 250,
          holidaySurgeEnabled: false,
          holidaySurgePct: 20,
        });
      expect(badRes.status).toBe(422);

      const putRes = await request(app)
        .put('/api/admin/pricing')
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({
          weekendSurgeEnabled: true,
          weekendSurgePct: 18,
          holidaySurgeEnabled: true,
          holidaySurgePct: 25,
        });
      expect(putRes.status).toBe(200);
      expect(putRes.body.weekendSurgeEnabled).toBe(true);
      expect(putRes.body.weekendSurgePct).toBe(18);
    });

    it('creates, toggles, and deletes admin notes', async () => {
      const createRes = await request(app)
        .post('/api/admin/notes')
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({ title: 'Check EV charger', description: 'Bay 4 check', category: 'Fleet Ops' });
      expect(createRes.status).toBe(201);
      createdNoteId = createRes.body.id;

      const patchRes = await request(app)
        .patch(`/api/admin/notes/${createdNoteId}`)
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({ isDone: true });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.isDone).toBe(true);

      const delRes = await request(app)
        .delete(`/api/admin/notes/${createdNoteId}`)
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken);
      expect(delRes.status).toBe(200);
      createdNoteId = null;
    });

    it('updates vehicle status and telematics', async () => {
      const statusRes = await request(app)
        .patch(`/api/admin/vehicles/${vehicleId}/status`)
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({ status: 'Maintenance' });
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.status).toBe('Maintenance');

      const teleRes = await request(app)
        .patch(`/api/admin/vehicles/${vehicleId}/telematics`)
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({
          registrationPlate: 'MH 12 WW 8888',
          hubLocation: 'Mumbai Airport T2',
          odometerKm: 2500,
          fuelChargePct: 86,
        });
      expect(teleRes.status).toBe(200);
    });

    it('approves driver KYC and generates GST invoice breakdown', async () => {
      const kycRes = await request(app)
        .patch(`/api/admin/users/${userId}/kyc`)
        .set('Cookie', authAdminCookies())
        .set('X-CSRF-Token', csrfToken)
        .send({ kycStatus: 'Verified', drivingLicenseNo: 'MH12 20240012345' });
      expect(kycRes.status).toBe(200);
      expect(kycRes.body.kycStatus).toBe('Verified');

      const invRes = await request(app)
        .get(`/api/admin/payments/${bookingId}/invoice`)
        .set('Cookie', [`access_token=${adminToken}`]);
      expect(invRes.status).toBe(200);
      expect(invRes.body.invoiceNumber).toContain('INV-WW-');
      expect(invRes.body.tax.grandTotal).toBe(10000);
      expect(invRes.body.tax.cgstAmount + invRes.body.tax.sgstAmount).toBeCloseTo(invRes.body.tax.totalGst, 2);
    });
  });
});
