'use strict';
require('dotenv').config();
const app = require('./app');
const { reportGoogleAuthConfig, validateGoogleOAuthConfig } = require('./services/googleAuth.service');
const { reportPaymentGatewayConfig, validatePaymentGatewayConfig } = require('./services/payment');

function validateEnvironment() {
  const isProd = process.env.NODE_ENV === 'production';
  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  const csrfSecret = process.env.CSRF_SECRET || '';

  const weakDefaults = ['dev_access_secret_change_me', 'dev_refresh_secret_change_me', 'dev_csrf_secret_change_me_in_production', 'REPLACE_WITH_64_BYTE_HEX_STRING', 'REPLACE_WITH_DIFFERENT_64_BYTE_HEX_STRING', 'REPLACE_WITH_32_BYTE_HEX_STRING'];

  const errors = [];

  if (isProd) {
    if (!accessSecret || accessSecret.length < 32 || weakDefaults.includes(accessSecret)) {
      errors.push('JWT_ACCESS_SECRET must be set and at least 32 characters in production');
    }
    if (!refreshSecret || refreshSecret.length < 32 || weakDefaults.includes(refreshSecret)) {
      errors.push('JWT_REFRESH_SECRET must be set and at least 32 characters in production');
    }
    if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
      errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must not be identical');
    }
    if (!csrfSecret || csrfSecret.length < 32 || weakDefaults.includes(csrfSecret)) {
      errors.push('CSRF_SECRET must be set and at least 32 characters in production');
    }
  } else {
    if (weakDefaults.includes(accessSecret) || !accessSecret) {
      console.warn('[SECURITY WARNING] Using weak or default JWT_ACCESS_SECRET in non-production mode.');
    }
    if (weakDefaults.includes(refreshSecret) || !refreshSecret) {
      console.warn('[SECURITY WARNING] Using weak or default JWT_REFRESH_SECRET in non-production mode.');
    }
  }

  // Report and validate Google OAuth environment variables
  reportGoogleAuthConfig();
  validateGoogleOAuthConfig();

  // Report and validate Payment Gateway configuration
  reportPaymentGatewayConfig();
  validatePaymentGatewayConfig();

  if (errors.length > 0) {
    console.error('\n============================================================');
    console.error('FATAL: Startup configuration validation failed:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('============================================================\n');
    throw new Error(`Startup failed: ${errors.join('; ')}`);
  }
}

// Validate environment on boot
validateEnvironment();

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`[server] carrental-api listening on port ${PORT} (${process.env.NODE_ENV})`);
});

module.exports = { app, server, validateEnvironment };
