'use strict';
const mysql = require('mysql2/promise');
const { assertSafeTestDatabase } = require('./dbGuard');

const targetDb = assertSafeTestDatabase(process.env.DB_NAME || 'wanderwheels_demo_test');

console.log(`[DB] Initializing connection pool for user "${process.env.DB_USER || 'none'}" on database "${targetDb}"`);

const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:            parseInt(process.env.DB_PORT || '3306', 10),
  user:            process.env.DB_USER     || '',
  password:        process.env.DB_PASS     || '',
  database:        targetDb,
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
  charset:         'utf8mb4',
  timezone:        '+00:00',
  decimalNumbers:  true,
  // Prepared statement caching
  namedPlaceholders: true,
});

pool.on('connection', () => {
  // intentionally minimal – avoid logging credentials
});

/**
 * Execute a query and return [rows, fields].
 * Always uses prepared statements (mysql2 does this automatically).
 */
async function query(sql, params) {
  return pool.execute(sql, params);
}

/**
 * Run a function inside a transaction.
 * The callback receives a connection that should be used for all queries.
 * The transaction is committed if the callback resolves, rolled back on throw.
 *
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction };
