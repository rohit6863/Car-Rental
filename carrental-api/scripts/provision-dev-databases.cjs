'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Writable } = require('stream');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const REQUIRED_DATABASES = [
  'wanderwheels_demo_test',
  'wanderwheels_jest_test',
  'wanderwheels_e2e_test',
];

/**
 * Validates database names to ensure strict test isolation.
 * Refuses 'carrental' and any database name not ending in '_test'.
 */
function validateDatabaseName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Database name must be a non-empty string');
  }
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === 'carrental') {
    throw new Error('Refusing to touch legacy database "carrental"');
  }
  if (!trimmed.endsWith('_test')) {
    throw new Error(`Database name "${trimmed}" must end with "_test"`);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    throw new Error(`Database name "${trimmed}" contains invalid characters`);
  }
  return trimmed;
}

/**
 * Pure function: Updates or appends key=value pairs in .env file content.
 * Preserves comments, whitespace, and non-target keys.
 */
function updateEnvContent(currentContent, updates) {
  const lines = currentContent && currentContent.trim().length > 0
    ? currentContent.split(/\r?\n/)
    : [];
  const handledKeys = new Set();

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const match = line.match(/^([A-Za-z_0-9]+)\s*=/);
    if (match && Object.prototype.hasOwnProperty.call(updates, match[1])) {
      const key = match[1];
      handledKeys.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  const unhandled = Object.entries(updates).filter(([k]) => !handledKeys.has(k));
  if (unhandled.length > 0) {
    if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
      newLines.push('');
    }
    for (const [key, val] of unhandled) {
      newLines.push(`${key}=${val}`);
    }
  }

  let result = newLines.join('\n');
  if (!result.endsWith('\n')) result += '\n';
  return result;
}

function ask(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(promptText, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

function askHidden(promptText) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(promptText, (ans) => {
        rl.close();
        resolve(ans);
      });
      return;
    }

    let muted = false;
    const mutableStdout = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) {
          process.stdout.write(chunk, encoding);
        }
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    process.stdout.write(promptText);
    muted = true;

    rl.question('', (answer) => {
      muted = false;
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function runProvisioning() {
  console.log('\n============================================================');
  console.log('  WanderWheels Local Development Database Provisioning');
  console.log('============================================================\n');

  const adminUser = await ask('Enter MySQL admin username (e.g. root): ');
  if (!adminUser) {
    console.error('Admin username cannot be empty.');
    process.exit(1);
  }

  const adminPass = await askHidden('Enter MySQL admin password (hidden, press Enter if empty): ');

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);

  console.log(`\nConnecting to MySQL at ${host}:${port} as ${adminUser}...`);
  let adminConn;
  try {
    adminConn = await mysql.createConnection({
      host,
      port,
      user: adminUser,
      password: adminPass,
      multipleStatements: true,
    });
  } catch (err) {
    console.error(`\nFailed to connect to MySQL: ${err.message}`);
    process.exit(1);
  }

  try {
    const [rows] = await adminConn.query('SELECT @@version AS version, @@port AS port, @@datadir AS datadir');
    const { version, port: sPort, datadir } = rows[0] || {};
    console.log('\n--- Target MySQL Instance ---');
    console.log(`  Version: ${version}`);
    console.log(`  Port:    ${sPort}`);
    console.log(`  DataDir: ${datadir}\n`);

    const confirmation = await ask('Type YES to continue: ');
    if (confirmation !== 'YES') {
      console.log('Aborted by user.');
      await adminConn.end();
      process.exit(0);
    }

    console.log('\n[1/4] Ensuring required test databases exist...');
    for (const db of REQUIRED_DATABASES) {
      validateDatabaseName(db);
      await adminConn.query(
        `CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`  ✓ Database confirmed: ${db}`);
    }

    console.log('\n[2/4] Configuring restricted user ww_dev@localhost...');
    const devPassword = crypto.randomBytes(24).toString('hex');

    await adminConn.query("CREATE USER IF NOT EXISTS 'ww_dev'@'localhost' IDENTIFIED BY ?", [devPassword]);
    await adminConn.query("ALTER USER 'ww_dev'@'localhost' IDENTIFIED BY ?", [devPassword]);

    try {
      await adminConn.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'ww_dev'@'localhost'");
    } catch {
      // Non-fatal if no global privileges exist
    }

    for (const db of REQUIRED_DATABASES) {
      await adminConn.query(`GRANT ALL ON \`${db}\`.* TO 'ww_dev'@'localhost'`);
      console.log(`  ✓ Granted ALL on ${db}.* to ww_dev@localhost`);
    }

    await adminConn.query('FLUSH PRIVILEGES');
    console.log('  ✓ Privileges flushed.');

    await adminConn.end();

    console.log('\n[3/4] Updating carrental-api/.env...');
    const envPath = path.resolve(__dirname, '..', '.env');
    const bakPath = path.resolve(__dirname, '..', '.env.bak');

    let currentEnv = '';
    if (fs.existsSync(envPath)) {
      currentEnv = fs.readFileSync(envPath, 'utf8');
      fs.writeFileSync(bakPath, currentEnv, 'utf8');
      console.log('  ✓ Saved backup copy to carrental-api/.env.bak');
    }

    const updates = {
      DB_USER: 'ww_dev',
      DB_PASS: devPassword,
      DB_NAME: 'wanderwheels_demo_test',
      TEST_DB_NAME: 'wanderwheels_jest_test',
      E2E_DB_NAME: 'wanderwheels_e2e_test',
    };

    const newEnv = updateEnvContent(currentEnv, updates);
    fs.writeFileSync(envPath, newEnv, 'utf8');
    console.log('credentials written to .env');

    console.log('\n[4/4] Verifying isolation wall as ww_dev@localhost...');
    const devConn = await mysql.createConnection({
      host,
      port,
      user: 'ww_dev',
      password: devPassword,
    });

    const [dbRows] = await devConn.query('SHOW DATABASES');
    const visibleDbs = dbRows.map((r) => Object.values(r)[0]);
    console.log(`  Visible databases: ${visibleDbs.join(', ')}`);

    const allowedDbs = new Set([
      'information_schema',
      'wanderwheels_demo_test',
      'wanderwheels_jest_test',
      'wanderwheels_e2e_test',
    ]);

    for (const db of visibleDbs) {
      if (!allowedDbs.has(db.toLowerCase())) {
        await devConn.end();
        throw new Error(`[WALL BREACH DETECTED] ww_dev has access to unauthorized database: "${db}"`);
      }
    }
    console.log('  ✓ No unauthorized databases visible.');

    let carrentalRefused = false;
    try {
      await devConn.query('USE `carrental`');
    } catch (err) {
      carrentalRefused = true;
      console.log(`  ✓ Access to legacy "carrental" refused by MySQL (${err.code || err.message}).`);
    }

    if (!carrentalRefused) {
      await devConn.end();
      throw new Error('[WALL BREACH DETECTED] ww_dev was able to USE carrental! Isolation failed.');
    }

    await devConn.end();

    console.log('\n============================================================');
    console.log('  SUCCESS: Isolation wall verified. Dev environment ready!');
    console.log('============================================================\n');
  } catch (err) {
    if (adminConn) await adminConn.end().catch(() => {});
    console.error(`\nProvisioning failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runProvisioning();
}

module.exports = {
  REQUIRED_DATABASES,
  validateDatabaseName,
  updateEnvContent,
};
