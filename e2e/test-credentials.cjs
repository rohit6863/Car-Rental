'use strict';
const crypto = require('crypto');

function generateSecureRandomPassword(prefix = 'TestPass') {
  return `${prefix}!${crypto.randomBytes(6).toString('hex')}A1`;
}

let cachedCustomerPassword = null;
function getTestCustomerCredentials() {
  const email = process.env.TEST_CUSTOMER_EMAIL || process.env.SEED_CUSTOMER_EMAIL || 'customer@example.com';
  if (!cachedCustomerPassword) {
    cachedCustomerPassword = process.env.TEST_CUSTOMER_PASSWORD || process.env.SEED_CUSTOMER_PASSWORD || generateSecureRandomPassword('CustTest');
  }
  return { email, password: cachedCustomerPassword };
}

let cachedAdminPassword = null;
function getTestAdminCredentials() {
  const username = process.env.TEST_ADMIN_USERNAME || process.env.SEED_ADMIN_USERNAME || 'admin';
  if (!cachedAdminPassword) {
    cachedAdminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || generateSecureRandomPassword('AdminTest');
  }
  return { username, password: cachedAdminPassword };
}

module.exports = {
  generateSecureRandomPassword,
  getTestCustomerCredentials,
  getTestAdminCredentials,
};
