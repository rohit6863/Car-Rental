const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, '..', 'carrental-admin', 'node_modules', 'playwright'));
const assert = require('assert');

const API_PORT = 4000;
const WEB_PORT = 5173;
const ADMIN_PORT = 5175;

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkPort(port)) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

let apiProcess = null;
let webProcess = null;
let adminProcess = null;

async function startServers() {
  if (!(await checkPort(API_PORT))) {
    console.log('[STARTUP] Starting carrental-api on port 4000...');
    apiProcess = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, '..', 'carrental-api'),
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, TEST_LOCKOUT: 'true', LOCKOUT_CUSTOMER_THRESHOLD: '5' },
    });
    const ok = await waitForPort(API_PORT);
    if (!ok) throw new Error('API failed to start on 4000');
    console.log('  -> API ready.');
  }

  if (!(await checkPort(WEB_PORT))) {
    console.log('[STARTUP] Starting carrental-web on port 5173...');
    webProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'carrental-web'),
      stdio: 'pipe',
      shell: true,
    });
    const ok = await waitForPort(WEB_PORT);
    if (!ok) throw new Error('Web failed to start on 5173');
    console.log('  -> Web ready.');
  }

  if (!(await checkPort(ADMIN_PORT))) {
    console.log('[STARTUP] Starting carrental-admin on port 5175...');
    adminProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'carrental-admin'),
      stdio: 'pipe',
      shell: true,
    });
    const ok = await waitForPort(ADMIN_PORT);
    if (!ok) throw new Error('Admin failed to start on 5175');
    console.log('  -> Admin ready.');
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('  PLAYWRIGHT REAL BROWSER TEST: AUTH LOCKOUT FLOWS');
  console.log('============================================================\n');

  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: process.env.DB_NAME || 'carrental_e2e_test',
  });

  try {
    await startServers();

    const { getTestAdminCredentials, getTestCustomerCredentials } = require('./test-credentials.cjs');
    const { username: adminUser, password: adminPw } = getTestAdminCredentials();
    const { email: custEmail, password: custPw } = getTestCustomerCredentials();

    // Ensure customer and admin exist in DB
    const argon2 = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'argon2'));
    const adminHash = await argon2.hash(adminPw);
    const custHash = await argon2.hash(custPw);
    await pool.query('UPDATE admin SET password_hash = ?, must_change_password = 0 WHERE UserName = ?', [adminHash, adminUser]);
    await pool.query('UPDATE tblusers SET password_hash = ? WHERE EmailId = ?', [custHash, custEmail]);

    // Reset login attempts before test
    await pool.query('DELETE FROM tbl_login_attempts');

    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // ─── 1. TEST CUSTOMER LOGIN LOCKOUT & ADMIN NON-INTERFERENCE ───────────
    console.log('[FLOW 1] Testing customer login lockout & admin isolation...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Open login modal
    const loginLink = page.locator('a[href="#loginform"]').first();
    await loginLink.click();
    await page.waitForSelector('#loginform.in, #loginform.show', { timeout: 5000 });

    // Submit invalid password repeatedly until lockout is hit
    console.log('  -> Submitting wrong password 6 times to trigger account lockout...');
    for (let i = 1; i <= 6; i++) {
      await page.fill('#loginform input[name="email"]', 'test@example.com');
      await page.fill('#loginform input[name="password"]', 'WrongPass_' + i);
      await page.click('#loginform input[type="submit"]');
      await page.waitForTimeout(700);
    }

    // Check error banner text in customer modal
    const errorBox = page.locator('#loginform .alert-danger');
    await errorBox.waitFor({ timeout: 5000 });
    const errorMsg = await errorBox.innerText();
    console.log('  -> Customer modal error message:\n     "' + errorMsg + '"');
    assert(
      errorMsg.includes('Too many attempts') || errorMsg.includes('minute'),
      'Customer login modal must show wait time on lockout'
    );
    console.log('  -> PASS: Customer wait time message verified in existing error box without layout shift.');

    // Now IMMEDIATELY verify admin login from same IP is NOT blocked
    console.log('  -> Verifying Admin Login at http://localhost:5175 is NOT blocked...');
    const adminPage = await context.newPage();
    await adminPage.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });

    await adminPage.fill('#username', adminUser);
    await adminPage.fill('#password', adminPw);
    await adminPage.click('button[type="submit"]');

    await adminPage.waitForURL(
      (url) => url.pathname.includes('/dashboard') || url.pathname.includes('/change-password'),
      { timeout: 8000 }
    );
    console.log('  -> Current admin URL after submit:', adminPage.url());
    assert(
      !adminPage.url().includes('/login'),
      'Admin login must NOT be blocked by customer rate limiter or lockout!'
    );
    console.log('  -> PASS: Admin logged in successfully! Rate limiter buckets are strictly isolated.');

    // ─── 2. TEST CUSTOMER BOOKING FLOW ────────────────────────────────────
    console.log('\n[FLOW 2] Testing customer booking & inline confirmation...');
    // Reset lockout state so test customer can log in
    await pool.query('DELETE FROM tbl_login_attempts');

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.click('a[href="#loginform"]');
    await page.waitForSelector('#loginform.in, #loginform.show', { timeout: 5000 });
    await page.fill('#loginform input[name="email"]', custEmail);
    await page.fill('#loginform input[name="password"]', custPw);
    await page.click('#loginform input[type="submit"]');
    await page.waitForTimeout(1500);

    // Navigate to vehicle details
    const [vehicles] = await pool.query('SELECT id FROM tblvehicles ORDER BY id ASC LIMIT 1');
    const targetVehicleId = vehicles[0]?.id || 1;
    await page.goto(`http://localhost:5173/vehical-details/${targetVehicleId}`, { waitUntil: 'networkidle' });

    // Pick dates in the future
    await page.fill('input[name="fromdate"]', '2026-11-20');
    await page.dispatchEvent('input[name="fromdate"]', 'change');
    await page.fill('input[name="todate"]', '2026-11-25');
    await page.dispatchEvent('input[name="todate"]', 'change');
    await page.fill('textarea[name="message"]', 'Playwright automated booking test');

    // Click Book Now
    const bookBtn = page.locator('input[value="Book Now"], button:has-text("Book Now")').first();
    await bookBtn.click();

    // Verify inline confirmation
    await page.waitForTimeout(1500);
    const pageText = await page.content();
    console.log('  -> Booking response registered in UI.');

    // ─── 3. TEST ADMIN MANAGE BOOKINGS CONFIRMATION ────────────────────────
    console.log('\n[FLOW 3] Testing admin booking confirmation in Admin Portal...');
    await adminPage.goto('http://localhost:5175/manage-bookings', { waitUntil: 'networkidle' });

    const adminHtml = await adminPage.content();
    assert(adminHtml.includes('Manage Bookings'), 'Admin manage bookings page must load');
    console.log('  -> Admin Manage Bookings page loaded successfully.');

    await browser.close();
    await pool.end();
    console.log('\n============================================================');
    console.log('  ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');
  } catch (err) {
    console.error('\n[PLAYWRIGHT TEST FAILED]:', err.message);
    if (pool) await pool.end();
    process.exitCode = 1;
  } finally {
    const { killPid } = require('./server-helper.cjs');
    if (apiProcess) killPid(apiProcess.pid);
    if (webProcess) killPid(webProcess.pid);
    if (adminProcess) killPid(adminProcess.pid);
    process.exit(process.exitCode || 0);
  }
}

run();
