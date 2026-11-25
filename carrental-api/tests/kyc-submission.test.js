'use strict';
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { signAccessToken } = require('../src/utils/jwt');
const { generateCsrfToken } = require('../src/middleware/csrf');
const { kycUploadDir } = require('../src/utils/upload');

// Minimal valid 1x1 PNG (89 50 4E 47 0D 0A 1A 0A ...)
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('Customer Driving License KYC Submission & Admin Verification', () => {
  const csrfNonce = 'test_nonce_kyc_flow_123';
  const csrfToken = generateCsrfToken(csrfNonce);

  let customerId;
  let unsubmittedCustomerId;
  let customerToken;
  let adminToken;
  const customerEmail = `kyc_submit_${Date.now()}@example.com`;
  const unsubmittedEmail = `kyc_unsubmitted_${Date.now()}@example.com`;

  const customerCookies = () => [
    `access_token=${customerToken}`,
    `csrf_nonce=${csrfNonce}`,
  ];
  const adminCookies = () => [
    `admin_access_token=${adminToken}`,
    `csrf_nonce=${csrfNonce}`,
  ];

  beforeAll(async () => {
    const [uRes] = await pool.query(
      'INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, KycStatus) VALUES (?, ?, ?, ?, ?)',
      ['KYC Test Driver', customerEmail, '9876543211', 'hash', 'Pending']
    );
    customerId = uRes.insertId;

    const [u2Res] = await pool.query(
      'INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, KycStatus) VALUES (?, ?, ?, ?, ?)',
      ['Unsubmitted Driver', unsubmittedEmail, '9876543212', 'hash', 'Pending']
    );
    unsubmittedCustomerId = u2Res.insertId;

    customerToken = signAccessToken({ id: customerId, email: customerEmail, role: 'user' });
    adminToken = signAccessToken({ id: 9101, username: 'admin', role: 'admin' });
  });

  afterAll(async () => {
    const [rows] = await pool.query(
      'SELECT KycDocumentPath FROM tblusers WHERE id IN (?, ?)',
      [customerId, unsubmittedCustomerId]
    );
    for (const r of rows) {
      if (r.KycDocumentPath) {
        const fp = path.resolve(kycUploadDir, path.basename(r.KycDocumentPath));
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    }
    await pool.query('DELETE FROM tblusers WHERE id IN (?, ?)', [customerId, unsubmittedCustomerId]);
    await pool.end();
  });

  it('rejects unauthenticated KYC submission with 401', async () => {
    const res = await request(app)
      .post('/api/users/kyc')
      .set('Cookie', [`csrf_nonce=${csrfNonce}`])
      .set('x-csrf-token', csrfToken)
      .field('drivingLicenseNo', 'MH12 20210048291');
    expect(res.status).toBe(401);
  });

  it('validates drivingLicenseNo length on POST /api/users/kyc', async () => {
    const res = await request(app)
      .post('/api/users/kyc')
      .set('Cookie', customerCookies())
      .set('x-csrf-token', csrfToken)
      .field('drivingLicenseNo', '12');
    expect(res.status).toBe(422);
  });

  it('submits Driving License KYC with photo and records KycSubmittedAt', async () => {
    const res = await request(app)
      .post('/api/users/kyc')
      .set('Cookie', customerCookies())
      .set('x-csrf-token', csrfToken)
      .field('drivingLicenseNo', 'MH12 20210048291')
      .attach('kycDocument', TINY_PNG, { filename: 'dl-front.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.kyc.drivingLicenseNo).toBe('MH12 20210048291');
    expect(res.body.kyc.kycStatus).toBe('Pending');
    expect(res.body.kyc.kycSubmittedAt).toBeTruthy();
    expect(res.body.kyc.hasKycDocument).toBe(true);
    expect(res.body.kyc.kycDocumentUrl).toBe('/api/users/kyc-document');

    const [dbRows] = await pool.query(
      'SELECT KycDocumentPath FROM tblusers WHERE id = ?',
      [customerId]
    );
    expect(dbRows[0].KycDocumentPath).toBeTruthy();

    const adminUsersRes = await request(app)
      .get('/api/admin/users')
      .set('Cookie', adminCookies());
    expect(adminUsersRes.status).toBe(200);
    const listedUser = adminUsersRes.body.find((u) => u.id === customerId);
    expect(listedUser).toBeDefined();
    expect(listedUser.hasKycDocument).toBe(true);
  });

  it('surfaces only submitted Pending KYC users in GET /api/admin/alerts', async () => {
    const res = await request(app)
      .get('/api/admin/alerts')
      .set('Cookie', adminCookies());

    expect(res.status).toBe(200);
    const kycAlerts = (res.body.alerts || []).filter((a) => a.type === 'kyc');
    expect(kycAlerts.some((a) => a.id === `kyc-${customerId}`)).toBe(true);
    expect(kycAlerts.some((a) => a.id === `kyc-${unsubmittedCustomerId}`)).toBe(false);
  });

  it('enforces auth & IDOR protection on KYC document endpoints', async () => {
    const unauth = await request(app).get('/api/users/kyc-document');
    expect(unauth.status).toBe(401);

    const custToAdmin = await request(app)
      .get(`/api/admin/users/${customerId}/kyc-document`)
      .set('Cookie', customerCookies());
    expect(custToAdmin.status).toBe(403);

    const ownerDoc = await request(app)
      .get('/api/users/kyc-document')
      .set('Cookie', customerCookies());
    expect(ownerDoc.status).toBe(200);
    expect(ownerDoc.headers['content-type']).toMatch(/image\/png/);

    const adminDoc = await request(app)
      .get(`/api/admin/users/${customerId}/kyc-document`)
      .set('Cookie', adminCookies());
    expect(adminDoc.status).toBe(200);
    expect(adminDoc.headers['content-type']).toMatch(/image\/png/);
  });

  it('allows admin to reject KYC with a reason and customer sees it on profile', async () => {
    const rejectRes = await request(app)
      .patch(`/api/admin/users/${customerId}/kyc`)
      .set('Cookie', adminCookies())
      .set('x-csrf-token', csrfToken)
      .send({
        status: 'Rejected',
        rejectionReason: 'License number blurred in photo',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.kycStatus).toBe('Rejected');
    expect(rejectRes.body.rejectionReason).toBe('License number blurred in photo');

    const profileRes = await request(app)
      .get('/api/users/profile')
      .set('Cookie', customerCookies());
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.kycStatus).toBe('Rejected');
    expect(profileRes.body.kycRejectionReason).toBe('License number blurred in photo');
  });

  it('allows admin to approve KYC and clears any previous rejection reason', async () => {
    const approveRes = await request(app)
      .patch(`/api/admin/users/${customerId}/kyc`)
      .set('Cookie', adminCookies())
      .set('x-csrf-token', csrfToken)
      .send({
        status: 'Verified',
        drivingLicenseNo: 'MH12 20210048291',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.kycStatus).toBe('Verified');
    expect(approveRes.body.rejectionReason).toBeNull();

    const profileRes = await request(app)
      .get('/api/users/profile')
      .set('Cookie', customerCookies());
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.kycStatus).toBe('Verified');
    expect(profileRes.body.kycRejectionReason).toBeNull();
  });
});
