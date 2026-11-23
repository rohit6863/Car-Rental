'use strict';
const RazorpayGateway = require('./RazorpayGateway');
const MockGateway = require('./MockGateway');
const { ServiceUnavailableError } = require('../../utils/errors');

let customGatewayInstance = null;
let mockGatewayInstance = null;
let razorpayGatewayInstance = null;

function getPaymentGateway() {
  if (customGatewayInstance) return customGatewayInstance;

  const type = (process.env.PAYMENT_GATEWAY || '').toLowerCase().trim();

  if (type === 'mock') {
    const isProd = process.env.NODE_ENV === 'production';
    const dbName = (process.env.DB_NAME || '').trim();
    const isTestDb = Boolean(dbName && dbName.endsWith('_test') && dbName.toLowerCase() !== 'carrental');
    if (isProd || (!isTestDb && process.env.NODE_ENV !== 'test')) {
      return null; // Safety: refuse mock gateway
    }
    if (!mockGatewayInstance) {
      mockGatewayInstance = new MockGateway();
    }
    return mockGatewayInstance;
  }

  if (type === 'razorpay') {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return null; // Missing required keys
    }
    if (!razorpayGatewayInstance) {
      razorpayGatewayInstance = new RazorpayGateway();
    }
    return razorpayGatewayInstance;
  }

  return null;
}

function requirePaymentGateway() {
  const gw = getPaymentGateway();
  if (!gw) {
    throw new ServiceUnavailableError('Online payments are currently unavailable');
  }
  return gw;
}

function setGatewayForTesting(gw) {
  customGatewayInstance = gw;
}

function resetGatewayForTesting() {
  customGatewayInstance = null;
  mockGatewayInstance = null;
  razorpayGatewayInstance = null;
}

/**
 * Report gateway status ("set" or "missing") at startup without leaking secrets.
 */
function reportPaymentGatewayConfig() {
  const selected = process.env.PAYMENT_GATEWAY || 'none';
  console.log(`[payment-config] Selected gateway: ${selected}`);

  const vars = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'MOCK_GATEWAY_SECRET'];
  vars.forEach((v) => {
    const isSet = Boolean(process.env[v] && process.env[v].trim() !== '');
    console.log(`  - ${v}: ${isSet ? 'set' : 'missing'}`);
  });
}

/**
 * Startup environment validation for payment gateways.
 */
function validatePaymentGatewayConfig() {
  const selected = (process.env.PAYMENT_GATEWAY || '').toLowerCase().trim();
  const isProd = process.env.NODE_ENV === 'production';
  const dbName = (process.env.DB_NAME || '').trim();
  const isTestDb = Boolean(dbName && dbName.endsWith('_test') && dbName.toLowerCase() !== 'carrental');

  if (selected === 'mock') {
    if (isProd) {
      throw new Error('[FATAL] PAYMENT_GATEWAY=mock is strictly prohibited in production.');
    }
    if (!isTestDb && process.env.NODE_ENV !== 'test') {
      throw new Error(`[FATAL] PAYMENT_GATEWAY=mock requires a test database ending in '_test', currently '${dbName}'.`);
    }
  }

  if (selected === 'razorpay') {
    const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.trim());
    const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET.trim());
    const hasWebhook = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET.trim());

    if (isProd) {
      if (!hasKeyId || !hasSecret || !hasWebhook) {
        throw new Error('[FATAL] Razorpay is enabled in production but RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, or RAZORPAY_WEBHOOK_SECRET is missing.');
      }
    } else {
      if (hasKeyId && !process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
        throw new Error('[FATAL] In non-production environments, RAZORPAY_KEY_ID must start with rzp_test_.');
      }
    }
  }
}

module.exports = {
  getPaymentGateway,
  requirePaymentGateway,
  setGatewayForTesting,
  resetGatewayForTesting,
  reportPaymentGatewayConfig,
  validatePaymentGatewayConfig,
  RazorpayGateway,
  MockGateway,
};
