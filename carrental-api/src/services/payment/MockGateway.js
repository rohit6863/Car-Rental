'use strict';
const crypto = require('crypto');
const PaymentGateway = require('./PaymentGateway');

class MockGateway extends PaymentGateway {
  constructor(options = {}) {
    super('mock');

    // Strict safety assertions: NEVER allow mock gateway in production or with live database
    const nodeEnv = process.env.NODE_ENV || 'development';
    const dbName = process.env.DB_NAME || '';

    if (nodeEnv === 'production') {
      throw new Error('[FATAL SECURITY ERROR] MockGateway cannot be initialized in production environment.');
    }

    if (!options.skipDbCheck) {
      if (!dbName || !dbName.endsWith('_test') || dbName.toLowerCase() === 'carrental') {
        throw new Error(`[FATAL SECURITY ERROR] MockGateway requires DB_NAME to end with '_test' (current: '${dbName}').`);
      }
    }

    this.mockSecret = options.mockSecret || process.env.MOCK_GATEWAY_SECRET || 'wanderwheels_mock_gateway_secret_2026';
    this.keyId = 'mock_key_rzp_test_123';
    this.mockOrders = new Map();
    this.mockPayments = new Map();
  }

  getPublicConfig() {
    return {
      gateway: 'mock',
      keyId: this.keyId,
      isMock: true,
    };
  }

  /**
   * Helper: compute valid payment signature using the mock secret.
   */
  signPayment({ orderId, paymentId }) {
    return crypto
      .createHmac('sha256', this.mockSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  /**
   * Helper: compute valid webhook signature over raw payload.
   */
  signWebhook(rawBody, secret = null) {
    const s = secret || this.mockSecret;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    return crypto
      .createHmac('sha256', s)
      .update(payload)
      .digest('hex');
  }

  /**
   * Create mock order.
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    const orderId = `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const order = {
      id: orderId,
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      receipt: String(receipt),
      status: 'created',
      notes,
      created_at: Math.floor(Date.now() / 1000),
    };

    this.mockOrders.set(orderId, order);
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    };
  }

  /**
   * Fetch payment details by payment ID.
   * Method values are always prefixed with "mock_" (e.g. mock_card, mock_upi).
   */
  async fetchPayment(paymentId) {
    if (this.mockPayments.has(paymentId)) {
      return this.mockPayments.get(paymentId);
    }

    // Default simulation based on paymentId naming
    const isFailed = paymentId.includes('fail') || paymentId.includes('reject');
    return {
      id: paymentId,
      order_id: 'order_mock_generic',
      amount: 100000,
      currency: 'INR',
      status: isFailed ? 'failed' : 'captured',
      method: 'mock_card',
      error_code: isFailed ? 'BAD_REQUEST_ERROR' : null,
      error_description: isFailed ? 'Simulated payment failure' : null,
    };
  }

  /**
   * Simulate a successful checkout payment in the mock gateway.
   */
  simulateSuccess({ orderId, method = 'mock_card' }) {
    const order = this.mockOrders.get(orderId) || { amount: 100000, currency: 'INR' };
    const paymentId = `pay_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const signature = this.signPayment({ orderId, paymentId });

    const paymentDetails = {
      id: paymentId,
      order_id: orderId,
      amount: order.amount,
      currency: order.currency,
      status: 'captured',
      method: method.startsWith('mock_') ? method : `mock_${method}`,
      error_code: null,
      error_description: null,
    };

    this.mockPayments.set(paymentId, paymentDetails);
    return {
      orderId,
      paymentId,
      signature,
      method: paymentDetails.method,
    };
  }

  /**
   * Simulate payment failure.
   */
  simulateFailure({ orderId, reason = 'payment_declined' }) {
    const paymentId = `pay_mock_failed_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const paymentDetails = {
      id: paymentId,
      order_id: orderId,
      amount: 0,
      currency: 'INR',
      status: 'failed',
      method: 'mock_card',
      error_code: 'PAYMENT_FAILED',
      error_description: reason,
    };

    this.mockPayments.set(paymentId, paymentDetails);
    return {
      orderId,
      paymentId,
      status: 'failed',
      error: reason,
    };
  }

  /**
   * Verify mock payment checkout signature.
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature) return false;
    const expected = this.signPayment({ orderId, paymentId });
    return PaymentGateway.constantTimeCompare(expected, signature);
  }

  /**
   * Verify mock webhook signature.
   */
  verifyWebhookSignature({ rawBody, signature, secret }) {
    const s = secret || this.mockSecret;
    if (!rawBody || !signature || !s) return false;
    const expected = this.signWebhook(rawBody, s);
    return PaymentGateway.constantTimeCompare(expected, signature);
  }

  /**
   * Parse mock webhook event.
   */
  parseWebhookEvent(rawBody) {
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
    const parsed = JSON.parse(bodyStr);

    const paymentEntity = parsed.payload?.payment?.entity || null;
    const orderEntity = parsed.payload?.order?.entity || null;
    const refundEntity = parsed.payload?.refund?.entity || null;

    return {
      event: parsed.event,
      type: parsed.event,
      eventId: parsed.id || parsed.event_id || `evt_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      orderId: paymentEntity?.order_id || orderEntity?.id,
      paymentId: paymentEntity?.id || refundEntity?.payment_id,
      method: paymentEntity?.method,
      payment: paymentEntity ? {
        id: paymentEntity.id,
        order_id: paymentEntity.order_id,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        status: paymentEntity.status,
        method: paymentEntity.method ? (paymentEntity.method.startsWith('mock_') ? paymentEntity.method : `mock_${paymentEntity.method}`) : 'mock_online',
        error_description: paymentEntity.error_description,
      } : null,
      order: orderEntity ? {
        id: orderEntity.id,
        amount: orderEntity.amount,
        amount_paid: orderEntity.amount_paid,
        currency: orderEntity.currency,
        status: orderEntity.status,
      } : null,
      refund: refundEntity ? {
        id: refundEntity.id,
        payment_id: refundEntity.payment_id,
        amount: refundEntity.amount,
        status: refundEntity.status,
      } : null,
      raw: parsed,
    };
  }
}

module.exports = MockGateway;
