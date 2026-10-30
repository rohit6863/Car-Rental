'use strict';
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const dbName = process.env.DB_NAME;

if (env === 'production' || !['development', 'test'].includes(env)) {
  console.error(`[dev:reset-limits] REFUSED: Refusing to run in production environment (NODE_ENV=${env}).`);
  process.exit(1);
}

if (dbName !== 'carrental_test') {
  console.error(`[dev:reset-limits] REFUSED: Refusing to run against non-test database. DB_NAME must be 'carrental_test', found '${dbName}'.`);
  process.exit(1);
}

const { query, pool } = require('../src/db/pool');

async function resetLimits() {
  try {
    const [result] = await query('DELETE FROM tbl_login_attempts');
    console.log(`[dev:reset-limits] SUCCESS: Cleared ${result.affectedRows || 0} failed login attempts from tbl_login_attempts.`);
    console.log('[dev:reset-limits] All account lockout states have been reset.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[dev:reset-limits] ERROR resetting limits:', err.message);
    await pool.end();
    process.exit(1);
  }
}

resetLimits();
