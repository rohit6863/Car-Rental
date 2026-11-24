'use strict';
const path = require('path');
try {
  require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'dotenv')).config({
    path: path.join(__dirname, '..', 'carrental-api', '.env')
  });
} catch {}
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

function getTestDbPoolConfig(database = process.env.E2E_DB_NAME || process.env.DB_NAME || 'wanderwheels_e2e_test') {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database,
    waitForConnections: true,
    connectionLimit: 5,
  };
}

module.exports = {
  generateSecureRandomPassword,
  getTestCustomerCredentials,
  getTestAdminCredentials,
  getTestDbPoolConfig,
};
