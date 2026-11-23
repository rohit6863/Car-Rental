'use strict';

/**
 * Validates target database name against strict safety rules:
 * 1. Must be a non-empty string.
 * 2. Must NEVER equal 'carrental' (case-insensitive, trimmed).
 * 3. Must strictly end with '_test' (case-insensitive).
 *
 * Throws a fatal Error if any rule is violated.
 */
function assertSafeTestDatabase(dbName) {
  const raw = (dbName || '').trim();
  const normalized = raw.toLowerCase();

  if (!raw) {
    throw new Error('[DATABASE GUARD FATAL] Database name cannot be empty. Must end with "_test".');
  }

  if (normalized === 'carrental') {
    throw new Error('[DATABASE GUARD FATAL] Refusing to connect to legacy database "carrental". The application must never operate against the legacy database.');
  }

  if (!normalized.endsWith('_test')) {
    throw new Error(`[DATABASE GUARD FATAL] Refusing to operate on database "${raw}". Target database name must strictly end with "_test" (e.g. wanderwheels_demo_test, wanderwheels_jest_test, wanderwheels_e2e_test).`);
  }

  return raw;
}

module.exports = {
  assertSafeTestDatabase,
};
