'use strict';
const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { md5Legacy, hashPassword } = require('../src/utils/crypto');
const { generateCsrfToken } = require('../src/middleware/csrf');

describe('Auth Endpoints & Argon2id Migration', () => {
  const csrfNonce = 'test_nonce_1234567890';
  const csrfToken = generateCsrfToken(csrfNonce);

  const dynamicTestPassword = `AuthTest!${crypto.randomBytes(6).toString('hex')}A1`;

  const testUser = {
    fullname: 'Test User',
    emailid: `test_${Date.now()}@example.com`,
    mobileno: '9876543210',
    password: dynamicTestPassword,
    confirmpassword: dynamicTestPassword,
  };

  afterAll(async () => {
    // Clean up created test user
    await pool.query('DELETE FROM tblusers WHERE EmailId = ?', [testUser.emailid]);
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with an Argon2id hash', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.emailid);

      // Verify in DB that password_hash starts with $argon2id$
      const [rows] = await pool.query('SELECT password_hash, Password FROM tblusers WHERE EmailId = ?', [testUser.emailid]);
      expect(rows.length).toBe(1);
      expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
    });

    it('should reject registration if email is already taken', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('should reject registration with invalid fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({ ...testUser, emailid: 'invalid-email' });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login and set httpOnly cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testUser.emailid,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toContain('access_token=');
      expect(cookies).toContain('HttpOnly');
    });

    it('should reject invalid credentials with generic error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          email: testUser.emailid,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid Details');
    });

    it('should lazy-upgrade a legacy MD5 hash to Argon2id on successful login', async () => {
      const legacyEmail = `legacy_${Date.now()}@example.com`;
      const legacyPassword = `LegacyUpgrade!${crypto.randomBytes(6).toString('hex')}A1`;
      const legacyMd5 = md5Legacy(legacyPassword);

      // Seed user with MD5 hash only
      await pool.query(
        'INSERT INTO tblusers (FullName, EmailId, Password, password_hash, ContactNo) VALUES (?, ?, ?, NULL, ?)',
        ['Legacy User', legacyEmail, legacyMd5, '9876500000']
      );

      // Login with password
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          email: legacyEmail,
          password: legacyPassword,
        });

      expect(res.status).toBe(200);

      // Check DB: password_hash should now be Argon2id and Password should be NULL
      const [rows] = await pool.query('SELECT password_hash, Password FROM tblusers WHERE EmailId = ?', [legacyEmail]);
      expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
      expect(rows[0].Password).toBeNull();

      // Clean up
      await pool.query('DELETE FROM tblusers WHERE EmailId = ?', [legacyEmail]);
    });
  });

  describe('GET /api/auth/check-email', () => {
    it('should report availability correctly', async () => {
      const res1 = await request(app).get(`/api/auth/check-email?email=${testUser.emailid}`);
      expect(res1.body.available).toBe(false);

      const res2 = await request(app).get('/api/auth/check-email?email=nonexistent_99999@example.com');
      expect(res2.body.available).toBe(true);
    });
  });
});
