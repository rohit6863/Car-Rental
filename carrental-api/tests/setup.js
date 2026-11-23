'use strict';
const { assertSafeTestDatabase } = require('../src/db/dbGuard');

process.env.NODE_ENV = 'test';
const dbName = assertSafeTestDatabase(process.env.TEST_DB_NAME || process.env.DB_NAME || 'wanderwheels_jest_test');
process.env.DB_NAME = dbName;
process.env.TEST_DB_NAME = dbName;
process.env.PORT = '4001';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_0123456789abcdef0123456789abcdef';
process.env.CSRF_SECRET = 'test_csrf_secret_0123456789abcdef';
process.env.COOKIE_SECURE = 'false';
