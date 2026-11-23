'use strict';
const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const { generateCsrfToken } = require('../src/middleware/csrf');
const { pool } = require('../src/db/pool');
const argon2 = require('argon2');

describe('Cookie Isolation: Customer vs Admin Authentication', () => {
  const csrfNonce = 'test_nonce_cookie_isolation';
  const csrfToken = generateCsrfToken(csrfNonce);

  const testAdminPassword = `AdminIso!${crypto.randomBytes(6).toString('hex')}A1`;
  const testCustomerPassword = `CustIso!${crypto.randomBytes(6).toString('hex')}A1`;

  let adminAccessTokenCookie = '';
  let customerAccessTokenCookie = '';

  beforeAll(async () => {
    const adminHash = await argon2.hash(testAdminPassword);
    await pool.query('UPDATE admin SET password_hash = ?, must_change_password = 0 WHERE UserName = ?', [adminHash, 'admin']);
    const custHash = await argon2.hash(testCustomerPassword);
    await pool.query(
      `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, auth_provider)
       VALUES ('Cookie Isolation Test User', 'test@example.com', '9876543210', '', ?, 'local')
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      [custHash]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM tblusers WHERE EmailId = ?', ['test@example.com']);
    await pool.end();
  });

  it('1. Admin login sets admin_access_token & admin_refresh_token, not customer tokens', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({ username: 'admin', password: testAdminPassword });

    expect(res.status).toBe(200);
    expect(res.body.admin).toBeDefined();

    const setCookies = res.headers['set-cookie'] || [];
    const cookieNames = setCookies.map(c => c.split('=')[0]);

    expect(cookieNames).toContain('admin_access_token');
    expect(cookieNames).toContain('admin_refresh_token');
    expect(cookieNames).not.toContain('access_token');
    expect(cookieNames).not.toContain('refresh_token');

    adminAccessTokenCookie = setCookies.find(c => c.startsWith('admin_access_token=')).split(';')[0];
  });

  it('2. Customer login sets access_token & refresh_token, not admin tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({ email: 'test@example.com', password: testCustomerPassword });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();

    const setCookies = res.headers['set-cookie'] || [];
    const cookieNames = setCookies.map(c => c.split('=')[0]);

    expect(cookieNames).toContain('access_token');
    expect(cookieNames).toContain('refresh_token');
    expect(cookieNames).not.toContain('admin_access_token');
    expect(cookieNames).not.toContain('admin_refresh_token');

    customerAccessTokenCookie = setCookies.find(c => c.startsWith('access_token=')).split(';')[0];
  });

  it('3. Both sessions can coexist without interference', async () => {
    const combinedCookieHeader = [`${adminAccessTokenCookie}`, `${customerAccessTokenCookie}`];

    // Admin endpoint recognizes admin session
    const adminRes = await request(app)
      .get('/api/admin/auth/me')
      .set('Cookie', combinedCookieHeader);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.admin).toBeDefined();
    expect(adminRes.body.admin.role).toBe('admin');

    // Customer endpoint recognizes customer session
    const customerRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', combinedCookieHeader);

    expect(customerRes.status).toBe(200);
    expect(customerRes.body.user).toBeDefined();
    expect(customerRes.body.user.role).toBe('user');
  });

  it('4. Customer logout only clears customer cookies, leaving admin session active', async () => {
    const combinedCookieHeader = [
      `csrf_nonce=${csrfNonce}`,
      `${adminAccessTokenCookie}`,
      `${customerAccessTokenCookie}`
    ];

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', combinedCookieHeader)
      .set('x-csrf-token', csrfToken);

    expect(logoutRes.status).toBe(200);

    const cleared = logoutRes.headers['set-cookie'] || [];
    const clearedNames = cleared.map(c => c.split('=')[0]);

    // Customer cookies cleared
    expect(clearedNames).toContain('access_token');
    expect(clearedNames).toContain('refresh_token');

    // Admin cookies NOT cleared
    expect(clearedNames).not.toContain('admin_access_token');
    expect(clearedNames).not.toContain('admin_refresh_token');

    // Admin can still access admin endpoints
    const adminRes = await request(app)
      .get('/api/admin/auth/me')
      .set('Cookie', [`${adminAccessTokenCookie}`]);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.admin.role).toBe('admin');
  });

  it('5. Admin logout only clears admin cookies', async () => {
    const combinedCookieHeader = [
      `csrf_nonce=${csrfNonce}`,
      `${adminAccessTokenCookie}`,
      `${customerAccessTokenCookie}`
    ];

    const logoutRes = await request(app)
      .post('/api/admin/auth/logout')
      .set('Cookie', combinedCookieHeader)
      .set('x-csrf-token', csrfToken);

    expect(logoutRes.status).toBe(200);

    const cleared = logoutRes.headers['set-cookie'] || [];
    const clearedNames = cleared.map(c => c.split('=')[0]);

    expect(clearedNames).toContain('admin_access_token');
    expect(clearedNames).toContain('admin_refresh_token');
    expect(clearedNames).not.toContain('access_token');
    expect(clearedNames).not.toContain('refresh_token');
  });
});
