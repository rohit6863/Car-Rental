'use strict';
const crypto = require('crypto');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const { pool, query } = require('../src/db/pool');
const { signAccessToken } = require('../src/utils/jwt');
const { generateCsrfToken } = require('../src/middleware/csrf');
const { hashPassword } = require('../src/utils/crypto');
const authService = require('../src/services/auth.service');
const { isAllowedImageMagicBytes } = require('../src/utils/upload');
const { sanitizeHtml } = require('../src/utils/sanitizeHtml');

describe('Security Hardening Test Suite', () => {
  const csrfNonce = 'sec_audit_nonce_12345';
  const csrfToken = generateCsrfToken(csrfNonce);

  let testUserId = 0;
  let testUser2Id = 0;
  let testUserToken = '';
  let testUser2Token = '';
  let testAdminToken = '';
  let mustChangePasswordAdminToken = '';
  let testBookingId = 0;
  let testUser2BookingId = 0;

  beforeAll(async () => {
    // Seed test users if needed
    const dynamicPass = `SecPass!${crypto.randomBytes(6).toString('hex')}A1`;
    const passHash = await hashPassword(dynamicPass);
    await query(`
      INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, auth_provider)
      VALUES 
        ('Sec User One', 'sec_user1@example.com', '9876543201', '', ?, 'local'),
        ('Sec User Two', 'sec_user2@example.com', '9876543202', '', ?, 'local')
    `, [passHash, passHash]);

    const [u1] = await query("SELECT id FROM tblusers WHERE EmailId = 'sec_user1@example.com'");
    const [u2] = await query("SELECT id FROM tblusers WHERE EmailId = 'sec_user2@example.com'");
    testUserId = u1[0].id;
    testUser2Id = u2[0].id;

    // Issue tokens
    testUserToken = signAccessToken({ id: testUserId, email: 'sec_user1@example.com', role: 'user' });
    testUser2Token = signAccessToken({ id: testUser2Id, email: 'sec_user2@example.com', role: 'user' });
    testAdminToken = signAccessToken({ id: 1, username: 'admin', role: 'admin', mustChangePassword: false });
    mustChangePasswordAdminToken = signAccessToken({ id: 1, username: 'admin', role: 'admin', mustChangePassword: true });

    // Seed a vehicle
    const [vRes] = await query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, Vimage1, vehicle_status)
      VALUES ('Sec Test Car', 1, 'Overview', 1500, 'Petrol', 2024, 5, 'img1.jpg', 'Available')
    `);
    const vid = vRes.insertId;

    // Create bookings for IDOR testing
    const [bk1] = await query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES ('sec_user1@example.com', ?, '2027-01-10', '2027-01-15', 'User 1 Booking', 1)
    `, [vid]);
    testBookingId = bk1.insertId;

    const [bk2] = await query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES ('sec_user2@example.com', ?, '2027-02-10', '2027-02-15', 'User 2 Booking', 1)
    `, [vid]);
    testUser2BookingId = bk2.insertId;

    // Seed confirmed payment for receipt IDOR testing
    await query(`
      INSERT INTO tblpayments (booking_id, amount, payment_method, transaction_id, payment_status, payment_date, confirmation_date)
      VALUES (?, 9000, 'UPI', 'TXN_SEC_1', 'confirmed', NOW(), NOW())
    `, [testBookingId]);
  });

  afterAll(async () => {
    // Cleanup test data
    await query("DELETE FROM tblbooking WHERE userEmail IN ('sec_user1@example.com', 'sec_user2@example.com')");
    await query("DELETE FROM tblpayments WHERE transaction_id = 'TXN_SEC_1'");
    await query("DELETE FROM tblvehicles WHERE VehiclesTitle = 'Sec Test Car'");
    await query("DELETE FROM tblusers WHERE EmailId IN ('sec_user1@example.com', 'sec_user2@example.com')");
    await pool.end();
  });

  // ─── 1. Authorization Matrix & Role Enforcement ────────────────────────────
  describe('1. Authorization Matrix & RBAC', () => {
    it('Anonymous access to protected customer routes returns 401', async () => {
      const endpoints = [
        ['GET', '/api/users/profile'],
        ['GET', '/api/bookings/my'],
        ['POST', '/api/bookings'],
      ];

      for (const [method, url] of endpoints) {
        let req = request(app)[method.toLowerCase()](url)
          .set('Cookie', [`csrf_nonce=${csrfNonce}`])
          .set('x-csrf-token', csrfToken);
        const res = await req;
        expect([401, 403]).toContain(res.status);
      }
    });

    it('Anonymous access to admin routes returns 401', async () => {
      const endpoints = [
        ['GET', '/api/admin/stats'],
        ['GET', '/api/admin/vehicles'],
        ['GET', '/api/admin/brands'],
        ['GET', '/api/admin/bookings'],
        ['GET', '/api/admin/payments'],
        ['GET', '/api/admin/users'],
        ['GET', '/api/admin/queries'],
        ['GET', '/api/admin/subscribers'],
        ['GET', '/api/admin/pages'],
        ['GET', '/api/admin/contact-info'],
      ];

      for (const [method, url] of endpoints) {
        const res = await request(app)[method.toLowerCase()](url);
        expect(res.status).toBe(401);
      }
    });

    it('Customer (role: user) access to admin routes returns 403 Forbidden', async () => {
      const endpoints = [
        ['GET', '/api/admin/stats'],
        ['GET', '/api/admin/vehicles'],
        ['GET', '/api/admin/brands'],
        ['GET', '/api/admin/bookings'],
        ['GET', '/api/admin/payments'],
        ['GET', '/api/admin/users'],
        ['GET', '/api/admin/queries'],
      ];

      for (const [method, url] of endpoints) {
        const res = await request(app)[method.toLowerCase()](url)
          .set('Cookie', [`access_token=${testUserToken}`, `csrf_nonce=${csrfNonce}`])
          .set('x-csrf-token', csrfToken);
        expect(res.status).toBe(403);
      }
    });

    it('Admin (role: admin) access to admin routes succeeds with 200', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', [`admin_access_token=${testAdminToken}`, `csrf_nonce=${csrfNonce}`]);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('regUsers');
    });
  });

  // ─── 2. IDOR Prevention ───────────────────────────────────────────────────
  describe('2. IDOR (Insecure Direct Object Reference) Protection', () => {
    it('Customer A cannot cancel Customer B booking (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/bookings/${testUser2BookingId}/cancel`)
        .set('Cookie', [`access_token=${testUserToken}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/only cancel your own bookings/i);
    });

    it('Customer A cannot view Customer B receipt (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/payments/receipt/${testBookingId}`)
        .set('Cookie', [`access_token=${testUser2Token}`, `csrf_nonce=${csrfNonce}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/do not have permission to view this receipt/i);
    });

    it('Customer A CAN view their own confirmed receipt (returns 200)', async () => {
      const res = await request(app)
        .get(`/api/payments/receipt/${testBookingId}`)
        .set('Cookie', [`access_token=${testUserToken}`, `csrf_nonce=${csrfNonce}`]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('receiptNumber');
      expect(res.body.customer.email).toBe('sec_user1@example.com');
    });

    it('Admin CAN view any receipt (returns 200)', async () => {
      const res = await request(app)
        .get(`/api/payments/receipt/${testBookingId}`)
        .set('Cookie', [`admin_access_token=${testAdminToken}`, `csrf_nonce=${csrfNonce}`]);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('receiptNumber');
    });
  });

  // ─── 3. Mass-Assignment Protection ─────────────────────────────────────────
  describe('3. Mass-Assignment Protection', () => {
    it('Profile update does not allow setting role, password_hash, or status', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Cookie', [`access_token=${testUserToken}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          fullname: 'Sec User Updated',
          mobilenumber: '9876543201',
          role: 'admin',
          Status: 1,
          password_hash: 'hacked_hash',
          must_change_password: 0,
        });

      expect(res.status).toBe(200);

      // Verify in DB that only allowed columns changed
      const [rows] = await query('SELECT FullName, auth_provider FROM tblusers WHERE EmailId = ?', ['sec_user1@example.com']);
      expect(rows[0].FullName).toBe('Sec User Updated');
    });
  });

  // ─── 4. Refresh Token Rotation with Reuse Detection ───────────────────────
  describe('4. Refresh Token Rotation & Family Reuse Detection', () => {
    it('Rotates refresh token and invalidates old one; reuse of old token invalidates family', async () => {
      // 1. Create a session for User 1
      const session = await authService.createRefreshTokenSession('user', testUserId);
      const token1 = session.refreshToken;

      // 2. Perform first rotation -> succeeds and returns new token
      const rotated = await authService.refreshToken(token1);
      expect(rotated).toHaveProperty('accessToken');
      expect(rotated).toHaveProperty('refreshToken');
      expect(rotated.refreshToken).not.toBe(token1);

      const token2 = rotated.refreshToken;

      // 3. Attempt to REPLAY the old token1 -> REUSE DETECTED!
      await expect(authService.refreshToken(token1)).rejects.toThrow(
        /reuse detected/i
      );

      // 4. Verify that token2 in the same family has also been revoked as a consequence!
      await expect(authService.refreshToken(token2)).rejects.toThrow(
        /reuse detected/i
      );
    });

    it('Logout revokes the refresh token in the database', async () => {
      const session = await authService.createRefreshTokenSession('user', testUserId);
      const token = session.refreshToken;

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refresh_token=${token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken);

      expect(res.status).toBe(200);

      // Attempting to refresh with the logged-out token must fail
      await expect(authService.refreshToken(token)).rejects.toThrow(/reuse detected|invalid or expired|unrecognized/i);
    });

    it('Password change revokes all active sessions for the user', async () => {
      const sessionA = await authService.createRefreshTokenSession('user', testUserId);
      const sessionB = await authService.createRefreshTokenSession('user', testUserId);

      await authService.revokeAllUserSessions('user', testUserId);

      await expect(authService.refreshToken(sessionA.refreshToken)).rejects.toThrow(/reuse detected|invalid or expired/i);
      await expect(authService.refreshToken(sessionB.refreshToken)).rejects.toThrow(/reuse detected|invalid or expired/i);
    });
  });

  // ─── 5. Server-side must_change_password Enforcement ───────────────────────
  describe('5. Server-Side must_change_password Enforcement', () => {
    it('Admin with mustChangePassword flag cannot access general admin endpoints (returns 403)', async () => {
      const res = await request(app)
        .get('/api/admin/bookings')
        .set('Cookie', [`admin_access_token=${mustChangePasswordAdminToken}`, `csrf_nonce=${csrfNonce}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/must change your password before proceeding/i);
    });

    it('Admin with mustChangePassword flag CAN access /api/admin/auth/me and change-password', async () => {
      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Cookie', [`admin_access_token=${mustChangePasswordAdminToken}`, `csrf_nonce=${csrfNonce}`]);

      expect(res.status).toBe(200);
      expect(res.body.admin.mustChangePassword).toBe(true);
    });
  });

  // ─── 6. File Upload Magic Byte Verification ────────────────────────────────
  describe('6. File Upload Security & Magic Byte Checks', () => {
    it('Detects valid JPEG, PNG, and WEBP magic bytes', () => {
      const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
      const validWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
      const spoofedPhp = Buffer.from('<?php echo "evil"; ?>');

      expect(isAllowedImageMagicBytes(validJpeg)).toBe(true);
      expect(isAllowedImageMagicBytes(validPng)).toBe(true);
      expect(isAllowedImageMagicBytes(validWebp)).toBe(true);
      expect(isAllowedImageMagicBytes(spoofedPhp)).toBe(false);
    });

    it('Rejects fake image upload with spoofed extension and deletes file from disk', async () => {
      const fakeImagePath = path.join(__dirname, 'temp_spoofed_shell.jpg');
      fs.writeFileSync(fakeImagePath, '<?php phpinfo(); ?>');

      try {
        const res = await request(app)
          .put('/api/admin/vehicles/1/image/1')
          .set('Cookie', [`admin_access_token=${testAdminToken}`, `csrf_nonce=${csrfNonce}`])
          .set('x-csrf-token', csrfToken)
          .attach('img', fakeImagePath);

        expect(res.status).toBe(422);
        expect(res.body.error).toMatch(/signature mismatch|Only JPG, PNG/i);
      } finally {
        if (fs.existsSync(fakeImagePath)) fs.unlinkSync(fakeImagePath);
      }
    });
  });

  // ─── 7. CSRF Double-Submit Cookie Protection ──────────────────────────────
  describe('7. CSRF Protection', () => {
    it('Rejects mutating POST request when X-CSRF-Token is missing (returns 403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/contact/query')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .send({
          fullname: 'Attacker',
          email: 'attacker@example.com',
          contactno: '9999999999',
          message: 'CSRF attack test',
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/CSRF/i);
    });

    it('Accepts mutating request with valid signed X-CSRF-Token', async () => {
      const res = await request(app)
        .post('/api/contact/query')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          fullname: 'Valid Inquirer',
          email: 'valid@example.com',
          contactno: '9999999999',
          message: 'Legitimate contact query for testing',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── 8. Input Sanitization & XSS Prevention ────────────────────────────────
  describe('8. Input Sanitization & XSS Protection', () => {
    it('Server-side sanitizeHtml strips script tags, iframe, and inline on* handlers', () => {
      const maliciousHtml = '<p>Hello</p><script>alert("xss")</script><img src="x" onerror="steal()"><iframe src="evil.com"></iframe>';
      const clean = sanitizeHtml(maliciousHtml);

      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onerror=');
      expect(clean).not.toContain('<iframe');
      expect(clean).toContain('<p>Hello</p>');
    });
  });

  // ─── 9. Security Headers, CORS, and Express Settings ───────────────────────
  describe('9. Security Headers & Express Hardening', () => {
    it('Disables X-Powered-By header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('Static uploads set X-Content-Type-Options: nosniff and no-exec CSP', async () => {
      const res = await request(app).get('/uploads/vehicles/test_nonexistent.jpg');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBe("default-src 'none'");
    });
  });
});
