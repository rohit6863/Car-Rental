'use strict';
/**
 * Migration runner.
 * Migrations are plain SQL files (or .js files for complex logic).
 * Each migration runs exactly once, tracked in `_migrations` table.
 * All migrations are idempotent and non-destructive.
 *
 * Usage:
 *   node src/migrations/runner.js          # run all pending
 *   node src/migrations/runner.js --list   # show status
 */
require('dotenv').config();
const path   = require('path');
const fs     = require('fs');
const mysql  = require('mysql2/promise');
const { assertSafeTestDatabase } = require('../db/dbGuard');

const MIGRATIONS_DIR = __dirname;

async function getConn() {
  const dbName = assertSafeTestDatabase(process.env.DB_NAME || 'wanderwheels_demo_test');
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: dbName,
    multipleStatements: true,
  });
  // Relax sql_mode for legacy tables with 0000-00-00 timestamp defaults during schema alterations
  await conn.query("SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION'");
  return conn;
}

async function ensureMigrationTable(conn) {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      ran_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getRanMigrations(conn) {
  const [rows] = await conn.execute('SELECT filename FROM _migrations ORDER BY id');
  return new Set(rows.map(r => r.filename));
}

async function markRan(conn, filename) {
  await conn.execute(
    'INSERT IGNORE INTO _migrations (filename) VALUES (?)',
    [filename]
  );
}

async function run() {
  const listOnly = process.argv.includes('--list');
  const conn = await getConn();
  await ensureMigrationTable(conn);
  const ran = await getRanMigrations(conn);

  // Collect SQL migration files (numbered 001_, 002_, …), skip this runner and dryrun scripts
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => /^\d{3}_.*\.sql$/.test(f))
    .sort();

  if (listOnly) {
    console.log('\nMigration status:');
    for (const f of files) {
      console.log(`  [${ran.has(f) ? '✓' : ' '}] ${f}`);
    }
    await conn.end();
    return;
  }

  let applied = 0;
  for (const file of files) {
    if (ran.has(file)) continue;
    console.log(`  Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    await conn.query(sql);
    await markRan(conn, file);
    applied++;
    console.log(`  ✓ ${file}`);
  }

  if (applied === 0) {
    console.log('All migrations are up to date.');
  } else {
    console.log(`\nApplied ${applied} migration(s).`);
  }

  await conn.end();
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
