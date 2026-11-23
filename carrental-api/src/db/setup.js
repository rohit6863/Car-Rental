'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { execSync } = require('child_process');

async function setup() {
  const dbName = (process.env.DB_NAME || 'carrental_test').trim();
  const isAllowedDb = dbName === 'carrental_test' || dbName.endsWith('_test') || process.env.NODE_ENV === 'development';
  if (!isAllowedDb && process.env.NODE_ENV === 'production') {
    throw new Error(`Refusing to run setup against database "${dbName}" in production.`);
  }

  console.log(`[DB SETUP] Initializing database "${dbName}"...`);

  // 1. Connect without database to ensure DB exists
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
  });

  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  console.log(`  ✓ Database "${dbName}" confirmed.`);
  await rootConn.end();

  // 2. Connect to database and execute schema.sql
  const dbConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: dbName,
    multipleStatements: true
  });

  const schemaPath = path.resolve(__dirname, '..', '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await dbConn.query(schemaSql);
  console.log('  ✓ Base schema DDL applied successfully.');
  await dbConn.end();

  // 3. Run all database migrations
  console.log('  → Running migrations...');
  const migRunnerPath = path.resolve(__dirname, '..', 'migrations', 'runner.js');
  execSync(`node "${migRunnerPath}"`, {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: dbName }
  });
  console.log('  ✓ All migrations up to date.');

  // 4. Run seed script
  console.log('  → Running seed...');
  const seedPath = path.resolve(__dirname, 'seed.js');
  execSync(`node "${seedPath}"`, {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: dbName }
  });
  console.log('  ✓ Database seed completed.');

  console.log(`\n[DB SETUP] Setup completed successfully for "${dbName}".`);
}

setup().catch(err => {
  console.error('[DB SETUP ERROR]', err);
  process.exit(1);
});
