'use strict';
const crypto = require('crypto');

function generateSecureRandomPassword(prefix = 'TestPass') {
  return `${prefix}!${crypto.randomBytes(6).toString('hex')}A1`;
}

function getTestCustomerCredentials() {
  const email = process.env.TEST_CUSTOMER_EMAIL || process.env.SEED_CUSTOMER_EMAIL || 'customer@example.com';
  const password = process.env.TEST_CUSTOMER_PASSWORD || process.env.SEED_CUSTOMER_PASSWORD || generateSecureRandomPassword('CustTest');
  return { email, password };
}

function getTestAdminCredentials() {
  const username = process.env.TEST_ADMIN_USERNAME || process.env.SEED_ADMIN_USERNAME || 'admin';
  const password = process.env.TEST_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
  return { username, password };
}

module.exports = {
  generateSecureRandomPassword,
  getTestCustomerCredentials,
  getTestAdminCredentials,
};
