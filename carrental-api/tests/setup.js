'use strict';
/**
 * Jest Global Setup File (runs BEFORE every test file, before any module is evaluated).
 *
 * This file is the single source of truth for all test environment variables.
 * It loads .env via dotenv so that credentials are available regardless of the
 * order in which test files import src/db/pool.js or src/app.js.
 */

// Load .env first so DB_USER / DB_PASS are in process.env before any module evaluates.
// This prevents the race where pool.js is imported before app.js triggers dotenv.config().
require('dotenv').config();

const path = require('path');
const { assertSafeTestDatabase } = require('../src/db/dbGuard');

// ── Database credentials guard ────────────────────────────────────────────────
// DB_USER and DB_PASS must be set (via .env or environment) before any suite
// connects. Failing early here produces a clear message instead of a cryptic
// "Access denied for user ''@'localhost'" deep inside a test.
const user = process.env.DB_USER ? String(process.env.DB_USER).trim() : '';
const pass = process.env.DB_PASS ? String(process.env.DB_PASS).trim() : '';

if (!user || !pass) {
  const missing = [];
  if (!user) missing.push('DB_USER');
  if (!pass) missing.push('DB_PASS');
  const errMsg = '\n============================================================\n' +
    `[FATAL] Test suite configuration error: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} empty.\n` +
    'Every test suite requires valid database credentials to maintain test isolation.\n' +
    'Please run "npm run db:provision" to provision the databases and populate carrental-api/.env,\n' +
    'or define DB_USER and DB_PASS in your environment.\n' +
    '============================================================\n';
  console.error(errMsg);
  throw new Error(errMsg);
}

// ── Jest test environment overrides ──────────────────────────────────────────
process.env.NODE_ENV = 'test';

const dbName = assertSafeTestDatabase(
  process.env.TEST_DB_NAME || process.env.DB_NAME || 'wanderwheels_jest_test'
);
process.env.DB_NAME      = dbName;
process.env.TEST_DB_NAME = dbName;
process.env.PORT         = '4001';

// JWT / CSRF secrets (use known test values; never production secrets here)
process.env.JWT_ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || 'test_access_secret_0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_0123456789abcdef0123456789abcdef';
process.env.CSRF_SECRET        = process.env.CSRF_SECRET        || 'test_csrf_secret_0123456789abcdef';
process.env.COOKIE_SECURE      = 'false';
