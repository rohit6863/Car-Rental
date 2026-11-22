'use strict';
const crypto = require('crypto');

/**
 * Base abstract class defining the PaymentGateway contract.
 */
class PaymentGateway {
  constructor(name) {
    if (new.target === PaymentGateway) {
      throw new TypeError('Cannot construct PaymentGateway instances directly');
    }
    this.name = name;
  }

  /**
   * Return public configuration to pass to frontend.
   * @returns {{ gateway: string, keyId: string|null, isMock: boolean }}
   */
  getPublicConfig() {
    throw new Error('Method getPublicConfig() must be implemented');
  }

  /**
   * Create an order with the payment gateway.
   * @param {Object} params
   * @param {number} params.amount Amount in smallest currency unit (e.g., paise)
   * @param {string} params.currency Currency code (e.g., 'INR')
   * @param {string} params.receipt Unique receipt identifier
   * @param {Object} [params.notes] Key-value metadata
   * @returns {Promise<{ id: string, amount: number, currency: string, status?: string }>}
   */
  async createOrder(_params) {
    throw new Error('Method createOrder() must be implemented');
  }

  /**
   * Fetch payment details by gateway payment ID.
   * @param {string} paymentId
   * @returns {Promise<{ id: string, order_id: string, amount: number, currency: string, status: string, method?: string, error_description?: string }>}
   */
  async fetchPayment(_paymentId) {
    throw new Error('Method fetchPayment() must be implemented');
  }

  /**
   * Verify HMAC signature of checkout payment completion.
   * @param {Object} params
   * @param {string} params.orderId
   * @param {string} params.paymentId
   * @param {string} params.signature
   * @returns {boolean}
   */
  verifyPaymentSignature(_params) {
    throw new Error('Method verifyPaymentSignature() must be implemented');
  }

  /**
   * Verify HMAC signature of incoming webhook raw body.
   * @param {Object} params
   * @param {Buffer|string} params.rawBody
   * @param {string} params.signature
   * @param {string} params.secret
   * @returns {boolean}
   */
  verifyWebhookSignature(_params) {
    throw new Error('Method verifyWebhookSignature() must be implemented');
  }

  /**
   * Parse webhook payload and extract standardized event details.
   * @param {Buffer|string} rawBody
   * @returns {{ event: string, eventId?: string, payment?: Object, order?: Object, refund?: Object, raw: Object }}
   */
  parseWebhookEvent(_rawBody) {
    throw new Error('Method parseWebhookEvent() must be implemented');
  }

  /**
   * Helper: Constant-time string comparison preventing timing attacks.
   * @param {string} expected
   * @param {string} actual
   * @returns {boolean}
   */
  static constantTimeCompare(expected, actual) {
    if (typeof expected !== 'string' || typeof actual !== 'string') return false;
    const bufExpected = Buffer.from(expected, 'utf8');
    const bufActual = Buffer.from(actual, 'utf8');
    if (bufExpected.length !== bufActual.length) return false;
    return crypto.timingSafeEqual(bufExpected, bufActual);
  }
}

module.exports = PaymentGateway;
