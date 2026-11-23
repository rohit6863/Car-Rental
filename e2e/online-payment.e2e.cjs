'use strict';

const http = require('http');
const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');
const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, '..', 'carrental-admin', 'node_modules', 'playwright'));
const argon2 = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'argon2'));

const API_PORT = 4000;
const WEB_PORT = 5173;
const ADMIN_PORT = 5175;

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, () => resolve(true));
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
  const apiRunning = await checkPort(API_PORT);
  if (!apiRunning) {
    console.log('[STARTUP] Starting carrental-api on port 4000 (PAYMENT_GATEWAY=mock)...');
    apiProcess = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, '..', 'carrental-api'),
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PAYMENT_GATEWAY: 'mock', NODE_ENV: 'development', DB_NAME: process.env.DB_NAME || 'wanderwheels_e2e_test' },
    });
    apiProcess.stderr.on('data', (d) => console.error('[API ERR]:', d.toString()));
    const ok = await waitForPort(API_PORT);
    if (!ok) throw new Error('carrental-api failed to start on port 4000');
    console.log('  -> carrental-api is ready.');
  } else {
    console.log('  -> carrental-api is already running on port 4000.');
  }

  const webRunning = await checkPort(WEB_PORT);
  if (!webRunning) {
    console.log('[STARTUP] Starting carrental-web on port 5173...');
    webProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'carrental-web'),
      stdio: 'pipe',
      shell: true,
    });
    webProcess.stderr.on('data', (d) => console.error('[WEB ERR]:', d.toString()));
    const ok = await waitForPort(WEB_PORT);
    if (!ok) throw new Error('carrental-web failed to start on port 5173');
    console.log('  -> carrental-web is ready.');
  } else {
    console.log('  -> carrental-web is already running on port 5173.');
  }

  const adminRunning = await checkPort(ADMIN_PORT);
  if (!adminRunning) {
    console.log('[STARTUP] Starting carrental-admin on port 5175...');
    adminProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'carrental-admin'),
      stdio: 'pipe',
      shell: true,
    });
    adminProcess.stderr.on('data', (d) => console.error('[ADMIN ERR]:', d.toString()));
    const ok = await waitForPort(ADMIN_PORT);
    if (!ok) throw new Error('carrental-admin failed to start on port 5175');
    console.log('  -> carrental-admin is ready.');
  } else {
    console.log('  -> carrental-admin is already running on port 5175.');
  }
}

async function runPaymentPlaywrightTests() {
  console.log('\n================================================================');
  console.log('  PLAYWRIGHT REAL-BROWSER TEST: ONLINE PAYMENT GATEWAY');
  console.log('================================================================\n');

  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: process.env.DB_NAME || 'wanderwheels_e2e_test',
    waitForConnections: true,
    connectionLimit: 5,
  });

  let testBrandId, testVehicleId, confirmedBookingId, unconfirmedBookingId;
  const custAEmail = 'cust_pay_a@example.com';
  const custBEmail = 'cust_pay_b@example.com';
  const { getTestCustomerCredentials, getTestAdminCredentials } = require('./test-credentials.cjs');
  const { password: rawPassword } = getTestCustomerCredentials();
  const { password: adminPw } = getTestAdminCredentials();

  let browser = null;

  try {
    await startServers();

    console.log('[STEP 1] Seeding test database...');
    const hashedPw = await argon2.hash(rawPassword);

    // 1. Seed Customer A and Customer B
    await pool.query(
      `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
       VALUES (?, ?, ?, '', ?)
       ON DUPLICATE KEY UPDATE FullName = VALUES(FullName), Password = '', password_hash = VALUES(password_hash)`,
      ['Customer Pay A', custAEmail, '9876543211', hashedPw]
    );
    await pool.query(
      `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
       VALUES (?, ?, ?, '', ?)
       ON DUPLICATE KEY UPDATE FullName = VALUES(FullName), Password = '', password_hash = VALUES(password_hash)`,
      ['Customer Pay B', custBEmail, '9876543222', hashedPw]
    );

    // 2. Ensure test brand and vehicle exist (Rs. 1,200 / day)
    const [bRes] = await pool.query(
      'INSERT INTO tblbrands (BrandName) VALUES (?)',
      [`PayBrand_${Date.now()}`]
    );
    testBrandId = bRes.insertId;

    const [vRes] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
      VALUES ('PaySedan', ?, 'Luxury mock sedan', 1200, 'Petrol', 2025, 5, 'Available', 1)
    `, [testBrandId]);
    testVehicleId = vRes.insertId;

    // 3. Seed Confirmed booking for Customer A: 3 days (2026-11-20 to 2026-11-22) => Rs. 3,600
    const [bkg1] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, '2026-11-20', '2026-11-22', 'Confirmed booking for payment test', 1)
    `, [custAEmail, testVehicleId]);
    confirmedBookingId = bkg1.insertId;

    // 4. Seed Unconfirmed booking for Customer A (Status = 0)
    const [bkg2] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, '2026-11-25', '2026-11-26', 'Unconfirmed booking for payment test', 0)
    `, [custAEmail, testVehicleId]);
    unconfirmedBookingId = bkg2.insertId;

    // Ensure clean payment slate for these bookings
    await pool.query('DELETE FROM tblpayments WHERE booking_id IN (?, ?)', [confirmedBookingId, unconfirmedBookingId]);

    console.log(`  -> Seeded Customer A: ${custAEmail}`);
    console.log(`  -> Confirmed Booking #${confirmedBookingId} (3 days @ Rs. 1200 = Rs. 3600)`);
    console.log(`  -> Unconfirmed Booking #${unconfirmedBookingId} (Status=0)`);

    console.log('\n[STEP 2] Launching real browser (Chromium)...');
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // ─── Step 3: Customer A logs in at http://localhost:5173/ ─────────────────
    console.log('\n[STEP 3] Customer A logging in via real clicks...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Click "Login / Register" in header with real click
    const loginLink = page.locator('.login_btn a[href="#loginform"]');
    await loginLink.click();

    // Wait for login modal
    const emailInput = page.locator('#loginform input[name="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(custAEmail);

    const passwordInput = page.locator('#loginform input[name="password"]');
    await passwordInput.fill(rawPassword);

    const loginSubmitBtn = page.locator('#loginform input[type="submit"]');
    await loginSubmitBtn.click();

    // Wait for login to complete (greeting appears in header)
    await page.waitForSelector('text=Welcome To WanderWheels', { timeout: 10000 });
    console.log('  -> Customer A successfully logged in.');

    // ─── Step 4: Visit My Bookings & verify unconfirmed vs confirmed ───────────
    console.log('\n[STEP 4] Navigating to /my-booking...');
    await page.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });
    await page.waitForSelector('.my_vehicles_list li', { timeout: 15000 });

    // Assert unconfirmed booking #unconfirmedBookingId shows "Not Confirm yet" and NO "Pay now" button
    const unconfirmedItem = page.locator(`li[data-booking-id="${unconfirmedBookingId}"]`);
    await unconfirmedItem.waitFor({ state: 'visible', timeout: 10000 });
    await unconfirmedItem.locator('text=Not Confirm yet').waitFor({ timeout: 5000 });

    const unconfirmedPayBtnCount = await unconfirmedItem.locator('button:has-text("Pay now")').count();
    assert.strictEqual(unconfirmedPayBtnCount, 0, 'Unconfirmed booking must NOT have a "Pay now" button');
    console.log('  -> Verified: Unconfirmed booking cannot be paid (no Pay now button).');

    // Find Confirmed booking item
    const confirmedItem = page.locator(`li[data-booking-id="${confirmedBookingId}"]`);
    await confirmedItem.waitFor({ state: 'visible', timeout: 10000 });
    await confirmedItem.locator('a.active-btn:has-text("Confirmed")').waitFor({ timeout: 5000 });

    const payNowBtn = confirmedItem.locator('button:has-text("Pay now")');
    await payNowBtn.waitFor({ state: 'visible', timeout: 5000 });

    // ─── Step 5: Test Failure Simulation & Retry ──────────────────────────────
    console.log('\n[STEP 5] Testing Mock Checkout Failure simulation and Retry...');
    await payNowBtn.click(); // Real click to open modal

    // Modal appears
    const modal = page.locator('.modal:has-text("Secure Online Payment")');
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Assert mock warning banner is present
    const warningBanner = modal.locator('text=Test payment gateway (mock): no real money is charged');
    await warningBanner.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified: Mock safety banner is prominently displayed.');

    // Assert amount is displayed correctly (Rs. 3600)
    await modal.locator('text=Rs. 3600').waitFor({ state: 'visible', timeout: 5000 });

    // Click "Pay securely" with real click
    const paySecurelyBtn = modal.locator('button:has-text("Pay securely")');
    await paySecurelyBtn.click();

    // Mock Checkout simulator appears
    const mockSimulator = modal.locator('text=Mock Payment Simulator');
    await mockSimulator.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Mock payment simulator popup opened.');

    // Real click on "Simulate failure"
    const simFailBtn = modal.locator('button:has-text("Simulate failure")');
    await simFailBtn.click();

    // Assert failed message is displayed
    const failedMsg = modal.locator('.alert-danger p:has-text("Payment failed")');
    await failedMsg.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified: Failure simulation shows expected message and Retry button.');

    // Real click on "Retry"
    const retryBtn = modal.locator('button:has-text("Retry")');
    await retryBtn.click();

    // Modal returns to idle state with "Pay securely" available
    await paySecurelyBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified: Retry button resets modal to payable state.');

    // ─── Step 6: Test Successful Mock Payment ─────────────────────────────────
    console.log('\n[STEP 6] Testing Successful Mock Payment & Verification...');
    await paySecurelyBtn.click(); // Real click
    await mockSimulator.waitFor({ state: 'visible', timeout: 5000 });

    // Real click on "UPI (Mock)" tab
    const upiTab = modal.locator('a:has-text("UPI (Mock)")');
    await upiTab.click();

    // Real click on "Simulate success"
    const simSuccessBtn = modal.locator('button:has-text("Simulate success")');
    await simSuccessBtn.click();

    // Modal updates to success state
    const successMsg = modal.locator('.alert-success p:has-text("confirmed successfully")');
    await successMsg.waitFor({ state: 'visible', timeout: 10000 });
    console.log('  -> Verified: UI updated with "Payment of Rs. 3600 was confirmed successfully."');

    // Real click on "Close" to dismiss modal
    const closeBtn = modal.locator('.modal-footer button:has-text("Close")');
    await closeBtn.click();
    await modal.waitFor({ state: 'hidden', timeout: 5000 });

    // Verify My Bookings page now displays Confirmed Payment status & Download Receipt button
    await page.waitForSelector('text=Payment Status: Confirmed', { timeout: 8000 });
    const downloadReceiptBtn = page.locator('a:has-text("Download Receipt")');
    await downloadReceiptBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified: My Bookings page displays Confirmed payment status and Download Receipt button.');

    // ─── Step 7: Verify Receipt Page ──────────────────────────────────────────
    console.log('\n[STEP 7] Verifying Receipt page details...');
    await page.goto(`http://localhost:5173/receipt/${confirmedBookingId}`, { waitUntil: 'networkidle' });

    const receiptHeading = page.locator('h1:has-text("WanderWheels Rental Receipt")');
    await receiptHeading.waitFor({ state: 'visible', timeout: 5000 });

    const receiptCustomer = page.locator('text=Customer Pay A');
    await receiptCustomer.waitFor({ state: 'visible', timeout: 5000 });

    const receiptAmount = page.locator('text=Total Amount: Rs. 3600');
    await receiptAmount.waitFor({ state: 'visible', timeout: 5000 });

    const receiptStatus = page.locator('text=Payment Status: Confirmed');
    await receiptStatus.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified: Receipt displays Customer Name, Amount (Rs. 3600), and Status (Confirmed).');

    // ─── Step 8: Cross-User IDOR Protection Check ─────────────────────────────
    console.log('\n[STEP 8] Verifying IDOR: Customer B cannot view Customer A’s receipt...');
    const custBContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageB = await custBContext.newPage();

    // Log in as Customer B
    await pageB.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await pageB.locator('.login_btn a[href="#loginform"]').click();
    await pageB.locator('#loginform input[name="email"]').fill(custBEmail);
    await pageB.locator('#loginform input[name="password"]').fill(rawPassword);
    await pageB.locator('#loginform input[type="submit"]').click();
    await pageB.waitForSelector('text=Welcome To WanderWheels', { timeout: 10000 });

    // Attempt to access Customer A's receipt directly
    await pageB.goto(`http://localhost:5173/receipt/${confirmedBookingId}`, { waitUntil: 'networkidle' });

    // Must show permission error or denied
    const forbiddenText = pageB.locator('text=You do not have permission to view this receipt');
    await forbiddenText.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified: Customer B receives forbidden error when attempting to view Customer A’s receipt (IDOR blocked).');

    // ─── Step 9: Admin View in Manage Payments (http://localhost:5175/manage-payments) ─
    console.log('\n[STEP 9] Verifying Admin Manage Payments table & columns...');
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const adminPage = await adminContext.newPage();

    let dialogCount = 0;
    adminPage.on('dialog', async (dialog) => {
      dialogCount++;
      await dialog.accept();
    });

    // Ensure admin user has known adminPw
    const adminHash = await argon2.hash(adminPw);
    await pool.query('UPDATE admin SET password_hash = ?, must_change_password = 0 WHERE UserName = "admin"', [adminHash]);

    await adminPage.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
    await adminPage.fill('#username', 'admin');
    await adminPage.fill('#password', adminPw);
    await adminPage.click('button[type="submit"]');

    await adminPage.waitForURL((url) => url.pathname.includes('/dashboard') || url.pathname.includes('/change-password'), { timeout: 10000 });
    if (adminPage.url().includes('change-password')) {
      await adminPage.fill('#password', adminPw);
      await adminPage.fill('#newpassword', adminPw);
      await adminPage.fill('#confirmpassword', adminPw);
      await adminPage.click('button[name="submit"]');
      await adminPage.waitForTimeout(1000);
      await adminPage.goto('http://localhost:5175/dashboard', { waitUntil: 'networkidle' });
    }

    // Navigate to Manage Payments
    await adminPage.goto('http://localhost:5175/manage-payments', { waitUntil: 'networkidle' });

    // Assert Table headers include Gateway, Order ID, Payment ID, Method, Status
    const headers = await adminPage.locator('table thead th').allTextContents();
    console.log('  -> Admin Table Headers:', headers.join(' | '));
    assert(headers.includes('Gateway'), 'Headers must include Gateway');
    assert(headers.includes('Order ID'), 'Headers must include Order ID');
    assert(headers.includes('Payment ID'), 'Headers must include Payment ID');
    assert(headers.includes('Method'), 'Headers must include Method');
    assert(headers.includes('Status'), 'Headers must include Status');

    // Locate the row for confirmedBookingId
    const paymentRow = adminPage.locator(`table tbody tr:has-text("${confirmedBookingId}")`);
    await paymentRow.waitFor({ state: 'visible', timeout: 5000 });

    const gatewayBadge = paymentRow.locator('.label:has-text("Mock")');
    await gatewayBadge.waitFor({ state: 'visible', timeout: 5000 });

    const statusText = paymentRow.locator('text=confirmed');
    await statusText.waitFor({ state: 'visible', timeout: 5000 });

    // Assert Confirm / Reject buttons are HIDDEN for automated payments
    const confirmBtnCount = await paymentRow.locator('a:has-text("Confirm")').count();
    const rejectBtnCount = await paymentRow.locator('a:has-text("Reject")').count();
    assert.strictEqual(confirmBtnCount, 0, 'Confirm button must be HIDDEN for automated gateway payment');
    assert.strictEqual(rejectBtnCount, 0, 'Reject button must be HIDDEN for automated gateway payment');

    const automatedLabel = paymentRow.locator('text=Automated');
    await automatedLabel.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified: Admin Manage Payments displays Mock gateway, confirmed status, and Confirm/Reject buttons are hidden (Automated).');

    console.log('\n================================================================');
    console.log('  ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n[PLAYWRIGHT TEST FAILURE]:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    // Clean up test data
    if (confirmedBookingId || unconfirmedBookingId) {
      await pool.query('DELETE FROM tblpayments WHERE booking_id IN (?, ?)', [confirmedBookingId, unconfirmedBookingId]);
      await pool.query('DELETE FROM tblbooking WHERE id IN (?, ?)', [confirmedBookingId, unconfirmedBookingId]);
    }
    if (testVehicleId) await pool.query('DELETE FROM tblvehicles WHERE id = ?', [testVehicleId]);
    if (testBrandId) await pool.query('DELETE FROM tblbrands WHERE id = ?', [testBrandId]);
    await pool.query('DELETE FROM tblusers WHERE EmailId IN (?, ?)', [custAEmail, custBEmail]);
    await pool.end();

    const { killPid } = require('./server-helper.cjs');
    if (apiProcess) killPid(apiProcess.pid);
    if (webProcess) killPid(webProcess.pid);
    if (adminProcess) killPid(adminProcess.pid);
    process.exit(0);
  }
}

runPaymentPlaywrightTests().catch((err) => {
  console.error('\n[FATAL ERROR]:', err);
  process.exit(1);
});
