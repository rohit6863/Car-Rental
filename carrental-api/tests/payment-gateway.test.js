'use strict';
const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const { signAccessToken } = require('../src/utils/jwt');
const { generateCsrfToken } = require('../src/middleware/csrf');
const {
  MockGateway,
  RazorpayGateway,
  setGatewayForTesting,
  resetGatewayForTesting,
} = require('../src/services/payment');

describe('Phase 5: Online Payment Gateway & Security Hardening', () => {
  const csrfNonce = 'test_nonce_payment_gateway';
  const csrfToken = generateCsrfToken(csrfNonce);

  let user1Token;
  let user2Token;
  let adminToken;
  let vehicleId;
  let bookingIdUser1;
  let bookingIdUnconfirmed;
  let mockGw;

  beforeAll(async () => {
    user1Token = signAccessToken({ id: 201, email: 'pay_user1@example.com', role: 'user' });
    user2Token = signAccessToken({ id: 202, email: 'pay_user2@example.com', role: 'user' });
    adminToken = signAccessToken({ id: 888, username: 'admin', role: 'admin' });

    // Seed test users
    await pool.query(
      'INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)',
      ['Pay User 1', 'pay_user1@example.com', '9888811111', 'hashed']
    );
    await pool.query(
      'INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)',
      ['Pay User 2', 'pay_user2@example.com', '9888822222', 'hashed']
    );

    // Seed vehicle (Rs. 1,500 / day)
    const [v] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
      VALUES ('PaymentTestCar', 1, 'Payment test vehicle', 1500, 'Petrol', 2025, 5, 'Available', 1)
    `);
    vehicleId = v.insertId;

    // Seed confirmed booking for User 1: 3 days (2026-11-10 to 2026-11-12) => Rs. 4,500 = 450,000 paise
    const [b1] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES ('pay_user1@example.com', ?, '2026-11-10', '2026-11-12', 'Confirmed booking', 1)
    `, [vehicleId]);
    bookingIdUser1 = b1.insertId;

    // Seed unconfirmed booking for User 1 (Status = 0)
    const [b2] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES ('pay_user1@example.com', ?, '2026-11-15', '2026-11-16', 'Unconfirmed booking', 0)
    `, [vehicleId]);
    bookingIdUnconfirmed = b2.insertId;

    mockGw = new MockGateway();
    setGatewayForTesting(mockGw);
  });

  afterAll(async () => {
    resetGatewayForTesting();
    await pool.query('DELETE FROM tbl_payment_events WHERE gateway = ?', ['mock']);
    await pool.query('DELETE FROM tblpayments WHERE booking_id IN (?, ?)', [bookingIdUser1, bookingIdUnconfirmed]);
    await pool.query('DELETE FROM tblbooking WHERE id IN (?, ?)', [bookingIdUser1, bookingIdUnconfirmed]);
    await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    await pool.query('DELETE FROM tblusers WHERE EmailId IN (?, ?)', ['pay_user1@example.com', 'pay_user2@example.com']);
  });

  // ─── 1. MockGateway Unit Tests ──────────────────────────────────────────────
  describe('MockGateway Unit Tests', () => {
    it('creates orders and simulates success with valid HMAC signature', async () => {
      const order = await mockGw.createOrder({
        amount: 450000,
        currency: 'INR',
        receipt: 'bkg_unit_1',
      });

      expect(order.id).toMatch(/^order_mock_/);
      expect(order.amount).toBe(450000);
      expect(order.currency).toBe('INR');

      const sim = mockGw.simulateSuccess({ orderId: order.id, method: 'mock_upi' });
      expect(sim.orderId).toBe(order.id);
      expect(sim.paymentId).toMatch(/^pay_mock_/);
      expect(sim.method).toBe('mock_upi');

      // Verify signature via gateway contract
      const isValid = mockGw.verifyPaymentSignature({
        orderId: order.id,
        paymentId: sim.paymentId,
        signature: sim.signature,
      });
      expect(isValid).toBe(true);

      // Verify fetched payment attributes
      const fetched = await mockGw.fetchPayment(sim.paymentId);
      expect(fetched.id).toBe(sim.paymentId);
      expect(fetched.order_id).toBe(order.id);
      expect(fetched.amount).toBe(450000);
      expect(fetched.status).toBe('captured');
    });

    it('simulates payment failure with failed status', async () => {
      const simFail = mockGw.simulateFailure({ orderId: 'order_test_fail', reason: 'insufficient_funds' });
      expect(simFail.status).toBe('failed');

      const fetched = await mockGw.fetchPayment(simFail.paymentId);
      expect(fetched.status).toBe('failed');
      expect(fetched.error_description).toBe('insufficient_funds');
    });

    it('signs and verifies webhook signatures with raw body', () => {
      const rawPayload = JSON.stringify({ event: 'payment.captured', id: 'evt_123' });
      const sig = mockGw.signWebhook(rawPayload);

      const isValid = mockGw.verifyWebhookSignature({
        rawBody: rawPayload,
        signature: sig,
      });
      expect(isValid).toBe(true);

      const isInvalid = mockGw.verifyWebhookSignature({
        rawBody: rawPayload,
        signature: 'wrong_tampered_signature',
      });
      expect(isInvalid).toBe(false);
    });

    it('enforces mock safety: refuses to initialize when NODE_ENV is production', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() => new MockGateway()).toThrow(/production environment/i);
      } finally {
        process.env.NODE_ENV = oldEnv;
      }
    });

    it('enforces mock safety: refuses to initialize when DB_NAME is not carrental_test', () => {
      const oldDb = process.env.DB_NAME;
      process.env.DB_NAME = 'carrental_live_production';
      try {
        expect(() => new MockGateway()).toThrow(/requires DB_NAME to be 'carrental_test'/i);
      } finally {
        process.env.DB_NAME = oldDb;
      }
    });
  });

  // ─── 2. RazorpayGateway Unit Tests (Mocked HTTP Layer) ──────────────────────
  describe('RazorpayGateway Unit Tests (Mocked HTTP)', () => {
    it('creates orders using basic auth and payment_capture', async () => {
      let capturedRequest = null;
      const mockHttpClient = async ({ path, method, body }) => {
        capturedRequest = { path, method, body };
        return {
          id: 'order_rzp_mock_123',
          amount: 500000,
          currency: 'INR',
          status: 'created',
        };
      };

      const rzpGw = new RazorpayGateway({
        keyId: 'rzp_test_mockKeyId',
        keySecret: 'mockSecret123',
        webhookSecret: 'mockWebhookSec456',
        httpClient: mockHttpClient,
      });

      const order = await rzpGw.createOrder({
        amount: 500000,
        currency: 'INR',
        receipt: 'bkg_99',
      });

      expect(order.id).toBe('order_rzp_mock_123');
      expect(capturedRequest.path).toBe('/orders');
      expect(capturedRequest.method).toBe('POST');
      expect(capturedRequest.body.payment_capture).toBe(1);
      expect(capturedRequest.body.amount).toBe(500000);
    });

    it('verifies payment signatures and webhook signatures accurately', () => {
      const rzpGw = new RazorpayGateway({
        keyId: 'rzp_test_sample',
        keySecret: 'secret_key_777',
        webhookSecret: 'webhook_sec_888',
      });

      const orderId = 'order_DAvL28q5Z5U0j1';
      const paymentId = 'pay_29QQoUBi66xm2f';
      const expectedSig = crypto
        .createHmac('sha256', 'secret_key_777')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(rzpGw.verifyPaymentSignature({ orderId, paymentId, signature: expectedSig })).toBe(true);
      expect(rzpGw.verifyPaymentSignature({ orderId, paymentId, signature: 'bad_signature' })).toBe(false);

      const rawWebhook = Buffer.from('{"event":"payment.captured"}', 'utf8');
      const webhookSig = crypto
        .createHmac('sha256', 'webhook_sec_888')
        .update(rawWebhook)
        .digest('hex');

      expect(rzpGw.verifyWebhookSignature({ rawBody: rawWebhook, signature: webhookSig })).toBe(true);
      expect(rzpGw.verifyWebhookSignature({ rawBody: rawWebhook, signature: 'invalid_sig' })).toBe(false);
    });
  });

  // ─── 3. End-to-End API Security & Payment Flow ──────────────────────────────
  describe('API Payment Lifecycle & Security Constraints', () => {
    let orderId;

    it('refuses order creation for unconfirmed booking (Status=0) with 422', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({ bookingId: bookingIdUnconfirmed });

      expect(res.status).toBe(422);
      expect(res.body.error || res.body.message).toMatch(/confirmed bookings/i);
    });

    it('enforces IDOR: Customer B cannot create an order for Customer A’s booking', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Cookie', [`access_token=${user2Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({ bookingId: bookingIdUser1 });

      expect(res.status).toBe(403);
      expect(res.body.error || res.body.message).toMatch(/only pay for your own booking/i);
    });

    it('creates an order with server-calculated amount, ignoring any client-sent amount', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          bookingId: bookingIdUser1,
          amount: 1, // Tampered amount attempt!
        });

      expect(res.status).toBe(200);
      expect(res.body.gateway).toBe('mock');
      expect(res.body.amount).toBe(450000); // Server-calculated 4500.00 INR = 450000 paise
      expect(res.body.bookingSummary.totalAmount).toBe(4500);
      expect(res.body.bookingSummary.days).toBe(3);

      orderId = res.body.orderId;
    });

    it('reuses existing pending order when called again for same booking without creating duplicate', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({ bookingId: bookingIdUser1 });

      expect(res.status).toBe(200);
      expect(res.body.orderId).toBe(orderId); // Reused identical order ID
    });

    it('rejects verification with forged/tampered signature with 422', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          bookingId: bookingIdUser1,
          orderId,
          paymentId: 'pay_mock_fake_123',
          signature: 'forged_signature_000000000000000000000000000000000000000000000000',
        });

      expect(res.status).toBe(422);
      expect(res.body.error || res.body.message).toMatch(/invalid payment signature/i);
    });

    it('enforces IDOR: Customer B cannot verify payment for Customer A’s booking', async () => {
      const sim = mockGw.simulateSuccess({ orderId, method: 'mock_card' });

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Cookie', [`access_token=${user2Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          bookingId: bookingIdUser1,
          orderId,
          paymentId: sim.paymentId,
          signature: sim.signature,
        });

      expect(res.status).toBe(403);
      expect(res.body.error || res.body.message).toMatch(/only verify payment for your own booking/i);
    });

    it('verifies valid mock payment and transitions status to confirmed', async () => {
      const sim = mockGw.simulateSuccess({ orderId, method: 'mock_upi' });

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          bookingId: bookingIdUser1,
          orderId,
          paymentId: sim.paymentId,
          signature: sim.signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/confirmed successfully/i);

      // Verify database row
      const [rows] = await pool.query('SELECT * FROM tblpayments WHERE booking_id = ?', [bookingIdUser1]);
      expect(rows[0].payment_status).toBe('confirmed');
      expect(rows[0].gateway).toBe('mock');
      expect(rows[0].gateway_payment_id).toBe(sim.paymentId);
    });

    it('is idempotent: concurrent or repeated verify calls return success without duplicating', async () => {
      const sim = mockGw.simulateSuccess({ orderId, method: 'mock_upi' });

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({
          bookingId: bookingIdUser1,
          orderId,
          paymentId: sim.paymentId,
          signature: sim.signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/already confirmed/i);
    });

    it('rejects creating new order if booking is already confirmed (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Cookie', [`access_token=${user1Token}`, `csrf_nonce=${csrfNonce}`])
        .set('x-csrf-token', csrfToken)
        .send({ bookingId: bookingIdUser1 });

      expect(res.status).toBe(409);
      expect(res.body.error || res.body.message).toMatch(/already confirmed/i);
    });

    it('enforces IDOR: Customer B cannot view Customer A’s payment status or receipt', async () => {
      // Status route
      const statusRes = await request(app)
        .get(`/api/payments/status/${bookingIdUser1}`)
        .set('Cookie', [`access_token=${user2Token}`]);
      expect(statusRes.status).toBe(403);

      // Receipt route
      const receiptRes = await request(app)
        .get(`/api/payments/receipt/${bookingIdUser1}`)
        .set('Cookie', [`access_token=${user2Token}`]);
      expect(receiptRes.status).toBe(403);

      // Customer A can view own status & receipt
      const ownStatus = await request(app)
        .get(`/api/payments/status/${bookingIdUser1}`)
        .set('Cookie', [`access_token=${user1Token}`]);
      expect(ownStatus.status).toBe(200);
      expect(ownStatus.body.status).toBe('confirmed');

      const ownReceipt = await request(app)
        .get(`/api/payments/receipt/${bookingIdUser1}`)
        .set('Cookie', [`access_token=${user1Token}`]);
      expect(ownReceipt.status).toBe(200);
      expect(ownReceipt.body.payment.totalAmount).toBe(4500);
      expect(ownReceipt.body.payment.paymentStatus).toBe('Confirmed');
    });
  });

  // ─── 4. Webhook Security & Out-of-Order Handling ─────────────────────────────
  describe('Webhook Security, Deduplication & Non-downgrading', () => {
    it('rejects webhooks with missing or forged signature with 422', async () => {
      const rawPayload = JSON.stringify({
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_x', order_id: 'order_x' } } },
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-mock-signature', 'forged_signature_hex')
        .send(rawPayload);

      expect(res.status).toBe(422);
      expect(res.body.error || res.body.message).toMatch(/invalid webhook signature/i);
    });

    it('deduplicates webhook events: replaying the same event_id returns duplicate status', async () => {
      const eventId = `evt_dedup_${Date.now()}`;
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        id: eventId,
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_dedup',
              order_id: 'order_nonexistent',
              status: 'captured',
              amount: 100000,
            },
          },
        },
      };

      const raw = JSON.stringify(payload);
      const signature = mockGw.signWebhook(raw);

      // First delivery
      const res1 = await request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-mock-signature', signature)
        .send(raw);

      expect(res1.status).toBe(200);
      expect(res1.body.received).toBe(true);

      // Replay delivery
      const res2 = await request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-mock-signature', signature)
        .send(raw);

      expect(res2.status).toBe(200);
      expect(res2.body.duplicate).toBe(true);
    });

    it('NEVER downgrades confirmed payment to failed upon receiving payment.failed webhook', async () => {
      // bookingIdUser1 is already confirmed in previous tests
      const [payments] = await pool.query('SELECT gateway_order_id FROM tblpayments WHERE booking_id = ?', [bookingIdUser1]);
      const confirmedOrderId = payments[0].gateway_order_id;

      const eventId = `evt_fail_downgrade_${Date.now()}`;
      const payload = {
        entity: 'event',
        event: 'payment.failed',
        id: eventId,
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_downgrade',
              order_id: confirmedOrderId,
              status: 'failed',
            },
          },
        },
      };

      const raw = JSON.stringify(payload);
      const signature = mockGw.signWebhook(raw);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-mock-signature', signature)
        .send(raw);

      expect(res.status).toBe(200);

      // Status in DB must remain 'confirmed'
      const [rows] = await pool.query('SELECT payment_status FROM tblpayments WHERE booking_id = ?', [bookingIdUser1]);
      expect(rows[0].payment_status).toBe('confirmed');
    });

    it('handles refund.processed webhook and marks payment as refunded', async () => {
      const [payments] = await pool.query('SELECT gateway_order_id, gateway_payment_id FROM tblpayments WHERE booking_id = ?', [bookingIdUser1]);
      const p = payments[0];

      const eventId = `evt_refund_${Date.now()}`;
      const payload = {
        entity: 'event',
        event: 'refund.processed',
        id: eventId,
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: p.gateway_payment_id,
              order_id: p.gateway_order_id,
              status: 'refunded',
            },
          },
        },
      };

      const raw = JSON.stringify(payload);
      const signature = mockGw.signWebhook(raw);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('x-mock-signature', signature)
        .send(raw);

      expect(res.status).toBe(200);

      const [rows] = await pool.query('SELECT payment_status FROM tblpayments WHERE booking_id = ?', [bookingIdUser1]);
      expect(rows[0].payment_status).toBe('refunded');
    });
  });

  // ─── 5. Admin Payment Management & Reconciliation ───────────────────────────
  describe('Admin Payment Operations', () => {
    it('blocks regular users from reconciling payments with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/admin/payments/reconcile/1')
        .set('Cookie', [`access_token=${user1Token}`]);

      expect(res.status).toBe(403);
    });

    it('allows admin to list payments with gateway and transaction fields', async () => {
      const res = await request(app)
        .get('/api/admin/payments')
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const p = res.body.find((item) => item.booking_id === bookingIdUser1);
      expect(p).toBeDefined();
      expect(p.gateway).toBe('mock');
      expect(p.gateway_order_id).toBeDefined();
    });
  });
});