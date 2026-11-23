'use strict';
const crypto = require('crypto');
const PaymentGateway = require('./PaymentGateway');

class RazorpayGateway extends PaymentGateway {
  constructor(options = {}) {
    super('razorpay');

    this.keyId = options.keyId || process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = options.keySecret || process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = options.webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
    this.baseUrl = options.baseUrl || 'https://api.razorpay.com/v1';

    // Allow mock HTTP client injection for testing without network requests
    this.httpClient = options.httpClient || null;
  }

  setHttpClientForTesting(client) {
    this.httpClient = client;
  }

  getPublicConfig() {
    return {
      gateway: 'razorpay',
      keyId: this.keyId,
      isMock: false,
    };
  }

  _getAuthHeader() {
    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async _request(path, method = 'GET', body = null) {
    if (this.httpClient) {
      return this.httpClient({ path, method, body });
    }

    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': this._getAuthHeader(),
      'Content-Type': 'application/json',
      'User-Agent': 'WanderWheels-CarRental/1.0',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.description || `Razorpay API error: ${res.statusText}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  /**
   * Create order in Razorpay.
   * Auto-captures payment (`payment_capture: 1`).
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    const payload = {
      amount: Math.round(amount),
      currency: currency.toUpperCase(),
      receipt: String(receipt).slice(0, 40),
      payment_capture: 1, // Assume auto-capture mode
      notes,
    };

    const order = await this._request('/orders', 'POST', payload);
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
    };
  }

  /**
   * Fetch payment details from Razorpay by payment ID.
   */
  async fetchPayment(paymentId) {
    const payment = await this._request(`/payments/${encodeURIComponent(paymentId)}`, 'GET');
    return {
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status, // e.g. 'captured', 'failed', 'refunded'
      method: payment.method || 'card',
      error_code: payment.error_code,
      error_description: payment.error_description,
    };
  }

  /**
   * Verify Razorpay checkout signature: HMAC-SHA256 of "order_id|payment_id" with key_secret.
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    if (!orderId || !paymentId || !signature || !this.keySecret) return false;
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return PaymentGateway.constantTimeCompare(expected, signature);
  }

  /**
   * Verify Razorpay webhook signature over raw request body using webhook_secret.
   */
  verifyWebhookSignature({ rawBody, signature, secret }) {
    const webhookSecret = secret || this.webhookSecret;
    if (!rawBody || !signature || !webhookSecret) return false;

    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    return PaymentGateway.constantTimeCompare(expected, signature);
  }

  /**
   * Parse Razorpay webhook event payload.
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
      eventId: parsed.id || null,
      orderId: paymentEntity?.order_id || orderEntity?.id,
      paymentId: paymentEntity?.id || refundEntity?.payment_id,
      method: paymentEntity?.method,
      payment: paymentEntity ? {
        id: paymentEntity.id,
        order_id: paymentEntity.order_id,
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        status: paymentEntity.status,
        method: paymentEntity.method,
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

module.exports = RazorpayGateway;
