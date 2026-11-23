'use strict';

const crypto = require('crypto');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { hashPassword } = require('../src/utils/crypto');
const { generateCsrfToken } = require('../src/middleware/csrf');

function genTestPassword(prefix = 'TestPass') {
  return `${prefix}!${crypto.randomBytes(6).toString('hex')}A1`;
}

describe('Password Flows Payload & Form Field Names Verification', () => {
  const csrfNonce = 'test_nonce_1234567890';
  const csrfToken = generateCsrfToken(csrfNonce);

  const testUserEmail = 'form_user_test@example.com';
  const initialPassword = genTestPassword('UserInit');
  const initialAdminPassword = genTestPassword('AdminInit');
  const updatedUserPassword = genTestPassword('UserUpdated');
  const brandNewPassword = genTestPassword('BrandNew');

  let userId;
  let adminId;
  let userCookie = [];
  let adminCookie = [];

  beforeAll(async () => {
    const hash = await hashPassword(initialPassword);

    // Seed test user
    await pool.query(
      `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
       VALUES (?, ?, '9876543299', '', ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
      ['Form Test User', testUserEmail, hash]
    );
    const [uRows] = await pool.query('SELECT id FROM tblusers WHERE EmailId = ?', [testUserEmail]);
    userId = uRows[0].id;

    // Seed test admin
    const adminHash = await hashPassword(initialAdminPassword);
    await pool.query('UPDATE admin SET password_hash = ?, Password = NULL, must_change_password = 0 WHERE UserName = "admin"', [adminHash]);
    const [aRows] = await pool.query('SELECT id FROM admin WHERE UserName = "admin"');
    adminId = aRows[0].id;

    // Log in user to get cookies
    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({ email: testUserEmail, password: initialPassword });
    userCookie = userLoginRes.headers['set-cookie'] || [];

    // Log in admin to get cookies
    const adminLoginRes = await request(app)
      .post('/api/admin/login')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({ username: 'admin', password: initialAdminPassword });
    adminCookie = adminLoginRes.headers['set-cookie'] || [];
  });

  afterAll(async () => {
    // Restore admin password
    const defaultAdminHash = await hashPassword(initialAdminPassword);
    await pool.query('UPDATE admin SET password_hash = ?, Password = NULL, must_change_password = 0 WHERE UserName = "admin"', [defaultAdminHash]);
    await pool.query('DELETE FROM tbl_password_resets WHERE email = ?', [testUserEmail]);
    await pool.query('DELETE FROM tblusers WHERE EmailId = ?', [testUserEmail]);
    await pool.end();
  });

  test('1. Admin change-password: sends exactly { password, newpassword, confirmpassword } and succeeds', async () => {
    const newAdminPass = genTestPassword('AdminNext');
    const payload = {
      password: initialAdminPassword,
      newpassword: newAdminPass,
      confirmpassword: newAdminPass,
    };

    console.log('[API TEST LOG] Admin change-password request body keys sent:', Object.keys(payload));
    expect(Object.keys(payload)).toEqual(['password', 'newpassword', 'confirmpassword']);

    const res = await request(app)
      .post('/api/admin/change-password')
      .set('Cookie', [...adminCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Restore admin password
    const restoreHash = await hashPassword(initialAdminPassword);
    await pool.query('UPDATE admin SET password_hash = ?, Password = NULL, must_change_password = 0 WHERE id = ?', [restoreHash, adminId]);
  });

  test('1b. Admin change-password: returns human-readable errors when fields are missing (no raw Zod text)', async () => {
    const emptyPayload = {};

    const res = await request(app)
      .post('/api/admin/change-password')
      .set('Cookie', [...adminCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send(emptyPayload);

    expect(res.status).toBe(422);
    expect(res.body.error).not.toContain('Invalid input: expected string, received undefined');
    expect(res.body.details).toBeDefined();

    const messages = res.body.details.map((d) => d.message);
    expect(messages).toContain('Current password is required');
    expect(messages).toContain('New password is required');
    expect(messages).toContain('Confirm password is required');
  });

  test('1c. Admin change-password: rejects password under 12 characters, over 128 characters, or common passwords', async () => {
    // Under 12 characters (e.g. 10 chars)
    const shortRes = await request(app)
      .post('/api/admin/change-password')
      .set('Cookie', [...adminCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        password: initialAdminPassword,
        newpassword: 'ShortPwd99!',
        confirmpassword: 'ShortPwd99!',
      });
    expect(shortRes.status).toBe(422);
    expect(shortRes.body.details[0].message).toContain('New password must be at least 12 characters');

    // Common password
    const commonRes = await request(app)
      .post('/api/admin/change-password')
      .set('Cookie', [...adminCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        password: initialAdminPassword,
        newpassword: 'administrator',
        confirmpassword: 'administrator',
      });
    expect(commonRes.status).toBe(422);
    expect(commonRes.body.details[0].message).toContain('Password is too common or easily guessed');

    // Over 128 characters
    const longPwd = 'A'.repeat(129);
    const longRes = await request(app)
      .post('/api/admin/change-password')
      .set('Cookie', [...adminCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        password: initialAdminPassword,
        newpassword: longPwd,
        confirmpassword: longPwd,
      });
    expect(longRes.status).toBe(422);
    expect(longRes.body.details[0].message).toContain('New password cannot exceed 128 characters');
  });

  test('2. Customer update-password: sends exactly { password, newpassword, confirmpassword } and succeeds', async () => {
    const payload = {
      password: initialPassword,
      newpassword: updatedUserPassword,
      confirmpassword: updatedUserPassword,
    };

    console.log('[API TEST LOG] Customer update-password request body keys sent:', Object.keys(payload));
    expect(Object.keys(payload)).toEqual(['password', 'newpassword', 'confirmpassword']);

    const res = await request(app)
      .put('/api/users/password')
      .set('Cookie', [...userCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify wrong current password produces human-readable error
    const anotherPwd = genTestPassword('AnotherPwd');
    const wrongRes = await request(app)
      .put('/api/users/password')
      .set('Cookie', [...userCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        password: 'TotallyWrongPassword999!',
        newpassword: anotherPwd,
        confirmpassword: anotherPwd,
      });

    expect(wrongRes.status).toBe(422);
    expect(wrongRes.body.error).toBe('Your current password is wrong');
  });

  test('2b. Customer update-password: rejects password under 8 characters or common passwords', async () => {
    const shortRes = await request(app)
      .put('/api/users/password')
      .set('Cookie', [...userCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        password: updatedUserPassword,
        newpassword: 'abc',
        confirmpassword: 'abc',
      });
    expect(shortRes.status).toBe(422);
    expect(shortRes.body.details[0].message).toContain('New password must be at least 8 characters');

    const commonRes = await request(app)
      .put('/api/users/password')
      .set('Cookie', [...userCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        password: updatedUserPassword,
        newpassword: '12345678',
        confirmpassword: '12345678',
      });
    expect(commonRes.status).toBe(422);
    expect(commonRes.body.details[0].message).toContain('Password is too common or easily guessed');
  });

  test('2c. Deprecation warning logged when legacy field alias is sent', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await request(app)
      .put('/api/users/password')
      .set('Cookie', [...userCookie, `csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        current_password: updatedUserPassword,
        new_password: genTestPassword('ValidNewPass'),
      });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[DEPRECATION WARNING]'));
    warnSpy.mockRestore();
  });

  test('3. Customer forgot-password: sends { email } and reset-password sends { token, newpassword, confirmpassword }', async () => {
    // Step A: Forgot password request
    const forgotPayload = { email: testUserEmail };
    console.log('[API TEST LOG] Forgot password request body keys sent:', Object.keys(forgotPayload));
    expect(Object.keys(forgotPayload)).toEqual(['email']);

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send(forgotPayload);

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    // Reset with invalid token
    const invalidTokenRes = await request(app)
      .post('/api/auth/reset-password')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        token: 'invalid_non_existent_token_hex_string',
        newpassword: brandNewPassword,
        confirmpassword: brandNewPassword,
      });

    expect(invalidTokenRes.status).toBe(422);
    expect(invalidTokenRes.body.error).toBe('Invalid or expired reset token');

    // Reset with mismatch passwords
    const mismatchRes = await request(app)
      .post('/api/auth/reset-password')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .send({
        token: 'anytoken',
        newpassword: brandNewPassword,
        confirmpassword: genTestPassword('MismatchPass'),
      });

    expect(mismatchRes.status).toBe(422);
    expect(mismatchRes.body.details[0].message).toContain('Passwords do not match');
  });
});
