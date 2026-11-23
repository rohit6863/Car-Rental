'use strict';
/**
 * WanderWheels End-to-End Test Suite Runner
 *
 * NOTE: Each individual .e2e.cjs script manages and boots its own isolated
 * backend (API on port 4000) and frontend (Web on port 5173, Admin on port 5175)
 * server processes using child processes.
 *
 * IMPORTANT: Please stop any running development servers (npm run dev) on ports
 * 4000, 5173, and 5175 before running this suite to avoid EADDRINUSE port collisions.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const e2eDbName = (process.env.E2E_DB_NAME || process.env.DB_NAME || 'carrental_e2e_test').trim();
if (!e2eDbName.endsWith('_test')) {
  console.error(`[FATAL] Refusing to run E2E test suite: target database "${e2eDbName}" must end in "_test" to protect non-test databases.`);
  process.exit(1);
}

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr ":${port} " | findstr "LISTENING"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      for (const line of out.trim().split('\n')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid) && parseInt(pid) > 0) {
          try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

function ensurePortsFree() {
  freePort(4000);
  freePort(5173);
  freePort(5175);
}

const testFiles = [
  'cancel-booking.e2e.cjs',
  'booking-concurrency.e2e.cjs',
  'google-auth.e2e.cjs',
  'mobile-payment.e2e.cjs',
  'password-flows.e2e.cjs',
  'payment-cancel-race.e2e.cjs',
  'online-payment.e2e.cjs',
  'auth-lockout-isolation.e2e.cjs',
  'admin-vehicle.e2e.cjs',
  'admin-management.e2e.cjs',
  'datepicker.e2e.cjs'
];

console.log('================================================================');
console.log('       WanderWheels Comprehensive End-to-End Test Suite        ');
console.log('================================================================');
console.log('Notice: Individual scripts manage their own ephemeral server');
console.log('instances. Verifying ports 4000, 5173, and 5175 are free...\n');
ensurePortsFree();

const results = [];
let passedCount = 0;
let failedCount = 0;

const startTime = Date.now();

for (const testFile of testFiles) {
  const testPath = path.join(__dirname, testFile);
  if (!fs.existsSync(testPath)) {
    console.error(`[SKIP] File not found: ${testFile}`);
    continue;
  }

  ensurePortsFree();

  console.log('\n----------------------------------------------------------------');
  console.log(`RUNNING: ${testFile}`);
  console.log('----------------------------------------------------------------');

  const tStart = Date.now();
  const proc = spawnSync(process.execPath, [testPath], {
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: e2eDbName },
    cwd: path.resolve(__dirname, '..')
  });

  const durationSec = ((Date.now() - tStart) / 1000).toFixed(1);
  const passed = proc.status === 0;

  if (passed) {
    passedCount++;
    results.push({ file: testFile, status: 'PASSED', duration: `${durationSec}s` });
    console.log(`\n[PASS] ${testFile} (${durationSec}s)`);
  } else {
    failedCount++;
    results.push({ file: testFile, status: 'FAILED', duration: `${durationSec}s`, code: proc.status });
    console.error(`\n[FAIL] ${testFile} (Exit code: ${proc.status}, ${durationSec}s)`);
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('\n================================================================');
console.log('                     E2E EXECUTION SUMMARY                      ');
console.log('================================================================');
results.forEach(r => {
  const padName = r.file.padEnd(35, ' ');
  const padStatus = r.status.padEnd(8, ' ');
  console.log(` ${padName} | ${padStatus} | ${r.duration}`);
});
console.log('================================================================');
console.log(`Total: ${testFiles.length} | Passed: ${passedCount} | Failed: ${failedCount} | Time: ${totalDuration}s`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
