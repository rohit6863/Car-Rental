'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const crypto = require('crypto');
const http = require('http');

const { assertSafeTestDatabase } = require('../src/db/dbGuard');

const nodeEnv = process.env.NODE_ENV || 'development';
const dbName = (process.env.DB_NAME || '').trim();

// Mock safety guards
if (nodeEnv === 'production') {
  console.error('[FATAL] dev:fire-webhook may not be run in production.');
  process.exit(1);
}

try {
  assertSafeTestDatabase(dbName);
} catch (err) {
  console.error('[FATAL] dev:fire-webhook may ONLY be run with DB_NAME ending in "_test".', err.message);
  process.exit(1);
}

const args = process.argv.slice(2);
const orderId = args[0];
const eventTypeArg = (args[1] || 'captured').toLowerCase();

if (!orderId) {
  console.error('Usage: npm run dev:fire-webhook -- <orderId> <captured|failed|refunded>');
  process.exit(1);
}

let eventType = 'payment.captured';
if (eventTypeArg === 'failed') eventType = 'payment.failed';
else if (eventTypeArg === 'refunded') eventType = 'refund.processed';

const secret = process.env.MOCK_GATEWAY_SECRET || 'wanderwheels_mock_gateway_secret_2026';
const eventId = `mock_evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
const paymentId = `mock_pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

const payload = {
  entity: 'event',
  account_id: 'acc_mock_dev',
  event: eventType,
  contains: ['payment'],
  payload: {
    payment: {
      entity: {
        id: paymentId,
        order_id: orderId,
        status: eventTypeArg === 'captured' ? 'captured' : (eventTypeArg === 'failed' ? 'failed' : 'refunded'),
        method: 'mock_webhook_script',
        amount: 100000,
        currency: 'INR',
      },
    },
  },
  created_at: Math.floor(Date.now() / 1000),
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

const port = process.env.PORT || 4000;
const req = http.request({
  hostname: 'localhost',
  port,
  path: '/api/payments/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(rawBody),
    'x-mock-signature': signature,
    'x-razorpay-signature': signature,
    'x-mock-event-id': eventId,
    'x-razorpay-event-id': eventId,
  },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`[fire-webhook] Status: ${res.statusCode}`);
    console.log(`[fire-webhook] Response: ${data}`);
  });
});

req.on('error', (err) => {
  console.error('[fire-webhook] Request failed:', err.message);
  process.exit(1);
});

req.write(rawBody);
req.end();