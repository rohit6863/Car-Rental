'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');
const { assertSafeTestDatabase } = require('../src/db/dbGuard');

async function resetDemo() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run reset-demo in production environment.');
  }

  const demoDbName = assertSafeTestDatabase(process.env.DEMO_DB_NAME || process.env.DB_NAME || 'wanderwheels_demo_test');
  console.log(`[RESET DEMO] Preparing to reset demonstration database "${demoDbName}"...`);

  // 1. Connect without database to ensure DB exists
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
  });

  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${demoDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  console.log(`  ✓ Database "${demoDbName}" confirmed.`);
  await rootConn.end();

  // 2. Connect to database and execute schema.sql (clean table structures)
  const dbConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: demoDbName,
    multipleStatements: true
  });

  const schemaPath = path.resolve(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await dbConn.query(schemaSql);
  console.log('  ✓ Clean schema DDL applied successfully.');
  await dbConn.end();

  // 3. Run all migrations
  console.log('  → Applying migrations...');
  const migRunnerPath = path.resolve(__dirname, '..', 'src', 'migrations', 'runner.js');
  execSync(`node "${migRunnerPath}"`, {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: demoDbName }
  });
  console.log('  ✓ Migrations up to date.');

  // 4. Run seed script with clean CMS demonstration copy
  console.log('  → Populating seed data and clean demonstration CMS copy...');
  const seedPath = path.resolve(__dirname, '..', 'src', 'db', 'seed.js');
  execSync(`node "${seedPath}"`, {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: demoDbName }
  });
  console.log('  ✓ Demonstration database seed complete.');

  console.log(`\n[RESET DEMO] Demonstration database "${demoDbName}" successfully reset with clean CMS copy!`);
}

resetDemo().catch(err => {
  console.error('[RESET DEMO ERROR]', err.message || err);
  process.exit(1);
});
