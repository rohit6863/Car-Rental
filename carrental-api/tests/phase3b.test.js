'use strict';
const request = require('supertest');
const { pool, query } = require('../src/db/pool');
const { generateCsrfToken } = require('../src/middleware/csrf');
const { hashPassword } = require('../src/utils/crypto');
const { sanitizeHtml } = require('../src/utils/sanitizeHtml');
const mailService = require('../src/services/mail.service');

describe('Phase 3b Verification Suite', () => {
  const csrfNonce = 'phase3b_test_nonce_123';
  const csrfToken = generateCsrfToken(csrfNonce);

  beforeAll(async () => {
    // Clean test lockout table
    await query('DELETE FROM tbl_login_attempts');

    // Seed test customer
    const passHash = await hashPassword('CustomerPass123!');
    await query(`
      INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, auth_provider)
      VALUES ('Phase3b Tester', 'phase3b_user@example.com', '9876543211', '', ?, 'local')
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
    `, [passHash]);

    // Seed test admin
    const adminHash = await hashPassword('AdminPass123!');
    await query(`
      INSERT INTO admin (UserName, Password, password_hash, must_change_password)
      VALUES ('phase3b_admin', '', ?, 0)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), must_change_password = 0
    `, [adminHash]);
  });

  afterAll(async () => {
    await query("DELETE FROM tblusers WHERE EmailId = 'phase3b_user@example.com'");
    await query("DELETE FROM admin WHERE UserName = 'phase3b_admin'");
    await query('DELETE FROM tbl_login_attempts');
    await pool.end();
  });

  describe('A. Rate Limiting & Account Lockout Isolation', () => {
    test('Environment variable thresholds: strict defaults in production vs relaxed in development', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalCust = process.env.RATE_LIMIT_CUSTOMER_LOGIN_MAX;
      const originalAdmin = process.env.RATE_LIMIT_ADMIN_LOGIN_MAX;
      delete process.env.RATE_LIMIT_CUSTOMER_LOGIN_MAX;
      delete process.env.RATE_LIMIT_ADMIN_LOGIN_MAX;
      delete process.env.LOCKOUT_CUSTOMER_THRESHOLD;
      delete process.env.LOCKOUT_ADMIN_THRESHOLD;

      try {
        jest.resetModules();
        process.env.NODE_ENV = 'production';
        const prodLimiter = require('../src/middleware/rateLimiter');
        const prodLockout = require('../src/utils/accountLockout');

        expect(prodLimiter.CONFIG.CUSTOMER_LOGIN_MAX).toBe(10);
        expect(prodLimiter.CONFIG.ADMIN_LOGIN_MAX).toBe(5);
        expect(prodLimiter.CONFIG.FORGOT_PASSWORD_MAX).toBe(5);
        expect(prodLimiter.CONFIG.REGISTER_MAX).toBe(5);
        expect(prodLimiter.CONFIG.CHECK_EMAIL_MAX).toBe(20);
        expect(prodLimiter.CONFIG.FORM_MAX).toBe(10);
        expect(prodLimiter.CONFIG.READONLY_MAX).toBe(100);
        expect(prodLockout.CONFIG.CUSTOMER_THRESHOLD).toBe(5);
        expect(prodLockout.CONFIG.ADMIN_THRESHOLD).toBe(3);

        jest.resetModules();
        process.env.NODE_ENV = 'development';
        const devLimiter = require('../src/middleware/rateLimiter');
        const devLockout = require('../src/utils/accountLockout');

        expect(devLimiter.CONFIG.CUSTOMER_LOGIN_MAX).toBeGreaterThan(prodLimiter.CONFIG.CUSTOMER_LOGIN_MAX);
        expect(devLimiter.CONFIG.ADMIN_LOGIN_MAX).toBeGreaterThan(prodLimiter.CONFIG.ADMIN_LOGIN_MAX);
        expect(devLockout.CONFIG.CUSTOMER_THRESHOLD).toBeGreaterThan(prodLockout.CONFIG.CUSTOMER_THRESHOLD);
        expect(devLockout.CONFIG.ADMIN_THRESHOLD).toBeGreaterThan(prodLockout.CONFIG.ADMIN_THRESHOLD);
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalCust) process.env.RATE_LIMIT_CUSTOMER_LOGIN_MAX = originalCust;
        if (originalAdmin) process.env.RATE_LIMIT_ADMIN_LOGIN_MAX = originalAdmin;
        jest.resetModules();
      }
    });

    test('Failed customer logins do not lock or block admin login', async () => {
      jest.resetModules();
      process.env.TEST_LOCKOUT = 'true';
      process.env.LOCKOUT_CUSTOMER_THRESHOLD = '5';
      const lockoutModule = require('../src/utils/accountLockout');
      const ip = '192.168.10.50';

      // Record 5 failed attempts for customer on IP
      for (let i = 0; i < 5; i++) {
        await lockoutModule.recordFailedAttempt('phase3b_user@example.com', ip);
      }

      // Customer is locked out from this IP
      await expect(
        lockoutModule.checkAccountLockout('phase3b_user@example.com', ip, false)
      ).rejects.toThrow(/Too many attempts/);

      // Admin login check for same IP must NOT be locked out
      await expect(
        lockoutModule.checkAccountLockout('phase3b_admin', ip, true)
      ).resolves.toBeUndefined();

      delete process.env.TEST_LOCKOUT;
      delete process.env.LOCKOUT_CUSTOMER_THRESHOLD;
      await query('DELETE FROM tbl_login_attempts');
    });

    test('5 wrong passwords from IP X do not lock that account on IP Y', async () => {
      jest.resetModules();
      process.env.TEST_LOCKOUT = 'true';
      process.env.LOCKOUT_CUSTOMER_THRESHOLD = '5';
      const lockoutModule = require('../src/utils/accountLockout');
      const ipX = '192.168.10.101';
      const ipY = '192.168.10.102';
      const email = 'phase3b_user@example.com';

      // 5 failed attempts from IP X
      for (let i = 0; i < 5; i++) {
        await lockoutModule.recordFailedAttempt(email, ipX);
      }

      // Locked on IP X
      await expect(lockoutModule.checkAccountLockout(email, ipX, false)).rejects.toThrow(/Too many attempts/);

      // Completely clear and allowed on IP Y
      await expect(lockoutModule.checkAccountLockout(email, ipY, false)).resolves.toBeUndefined();

      delete process.env.TEST_LOCKOUT;
      delete process.env.LOCKOUT_CUSTOMER_THRESHOLD;
      await query('DELETE FROM tbl_login_attempts');
    });

    test('Helper calls (/me, /csrf, /check-email) have separate limiters and do not count against login', () => {
      const rateLimiterModule = require('../src/middleware/rateLimiter');
      const { customerLoginLimiter, adminLoginLimiter, checkEmailLimiter, readOnlyAuthLimiter } = rateLimiterModule;
      expect(customerLoginLimiter).not.toBe(adminLoginLimiter);
      expect(customerLoginLimiter).not.toBe(checkEmailLimiter);
      expect(customerLoginLimiter).not.toBe(readOnlyAuthLimiter);
    });

    test('Unknown identifiers behave and respond identically to known ones (no user enumeration)', async () => {
      const app = require('../src/app');

      // Bad password on existing user
      const resKnown = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'phase3b_user@example.com', password: 'WrongPassword123' });

      // Bad password on non-existent user
      const resUnknown = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'nonexistent_account_987@example.com', password: 'WrongPassword123' });

      expect(resKnown.status).toBe(401);
      expect(resUnknown.status).toBe(401);
      expect(resKnown.body).toEqual(resUnknown.body);
      expect(resKnown.body.error).toBe('Invalid Details');
    });
  });

  describe('B. Forgot-Password Consistency & Reset Target Security', () => {
    const app = require('../src/app');

    test('Returns 422 for malformed email inputs (identically for existing and non-existing)', async () => {
      const malformedInputs = [
        'notanemail',
        'user@',
        '@domain.com',
        'user@domain',
        '',
        'a'.repeat(101) + '@example.com',
      ];

      for (const input of malformedInputs) {
        const res = await request(app)
          .post('/api/auth/forgot-password')
          .set('Cookie', [`csrf_nonce=${csrfNonce}`])
          .set('X-CSRF-Token', csrfToken)
          .send({ email: input });

        expect(res.status).toBe(422);
        expect(res.body.error).toBe('Validation failed');
      }
    });

    test('Well-formed unregistered email returns exact same 200 and body as registered email', async () => {
      const resRegistered = await request(app)
        .post('/api/auth/forgot-password')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'phase3b_user@example.com' });

      const resUnregistered = await request(app)
        .post('/api/auth/forgot-password')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'completely_unregistered_9876@example.com' });

      expect(resRegistered.status).toBe(200);
      expect(resUnregistered.status).toBe(200);
      expect(resRegistered.body).toEqual({
        success: true,
        message: 'If this email is registered, you will receive a reset link shortly.',
      });
      expect(resUnregistered.body).toEqual(resRegistered.body);
    });

    test('Reset email is dispatched strictly to the database-stored address', async () => {
      let dispatchedTo = '';
      const testMailService = require('../src/services/mail.service');
      const authService = require('../src/services/auth.service');
      const origSend = testMailService.sendPasswordResetEmail;
      testMailService.sendPasswordResetEmail = async (to, token) => {
        dispatchedTo = to;
        return { messageId: 'test_123' };
      };

      try {
        await authService.forgotPassword('phase3b_user@example.com', '127.0.0.1');
        expect(dispatchedTo).toBe('phase3b_user@example.com');
      } finally {
        testMailService.sendPasswordResetEmail = origSend;
      }
    });
  });

  describe('C. CSP Headers (upgrade-insecure-requests conditionality)', () => {
    test('upgrade-insecure-requests is omitted in development mode and present in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        // Development
        jest.resetModules();
        process.env.NODE_ENV = 'development';
        const devApp = require('../src/app');
        const devRes = await request(devApp).get('/api/vehicles');
        expect(devRes.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');

        // Production
        jest.resetModules();
        process.env.NODE_ENV = 'production';
        const prodApp = require('../src/app');
        const prodRes = await request(prodApp).get('/api/vehicles');
        expect(prodRes.headers['content-security-policy']).toContain('upgrade-insecure-requests');
      } finally {
        process.env.NODE_ENV = originalEnv;
        jest.resetModules();
      }
    });
  });

  describe('D. Quill & HTML Content XSS Sanitization', () => {
    test('sanitizeHtml strips script tags, iframe, onerror handlers, and javascript: links', () => {
      const maliciousPayload = `
        <p>Valid text</p>
        <script>alert('XSS')</script>
        <img src="x" onerror="alert('XSS_IMAGE')" />
        <a href="javascript:alert('XSS_LINK')">Click me</a>
        <iframe src="http://evil.com"></iframe>
      `;

      const cleaned = sanitizeHtml(maliciousPayload);

      expect(cleaned).not.toContain('<script');
      expect(cleaned).not.toContain('onerror=');
      expect(cleaned).not.toContain('javascript:');
      expect(cleaned).not.toContain('<iframe');
      expect(cleaned).toContain('Valid text');
      expect(cleaned).toContain('Click me');
    });
  });
});
