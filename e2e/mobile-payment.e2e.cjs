'use strict';

const http = require('http');
const path = require('path');
const assert = require('assert');
const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, '..', 'carrental-admin', 'node_modules', 'playwright'));
const argon2 = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'argon2'));
const { ensureServers, stopServers } = require('./server-helper.cjs');

const API_PORT = 4000;
const WEB_PORT = 5173;

async function runMobilePaymentPlaywrightTest() {
  console.log('\n================================================================');
  console.log('  PLAYWRIGHT REAL-BROWSER TEST: MOBILE PAYMENT WINDOW (ITEM 3)');
  console.log('================================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'wanderwheels_e2e_test',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const testEmail = `mobile_pay_${Date.now()}@example.com`;
  const { password } = require('./test-credentials.cjs').getTestCustomerCredentials();

  console.log('[SEED] Seeding test database...');
  const hashedPw = await argon2.hash(password);

  await pool.query(
    `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
     VALUES (?, ?, '9876543233', '', ?)`,
    ['Mobile Payment User', testEmail, hashedPw]
  );

  const [bRes] = await pool.query('INSERT INTO tblbrands (BrandName) VALUES (?)', [`MobBrand_${Date.now()}`]);
  const [vRes] = await pool.query(`
    INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
    VALUES ('MobileSedan', ?, 'Mobile Sedan overview', 1800, 'Petrol', 2025, 5, 'Available', 1)
  `, [bRes.insertId]);
  const vehicleId = vRes.insertId;

  const [bkg] = await pool.query(`
    INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
    VALUES (?, ?, '2026-12-15', '2026-12-17', 'Mobile test booking', 1)
  `, [testEmail, vehicleId]);
  const bookingId = bkg.insertId;

  await pool.query('DELETE FROM tblpayments WHERE booking_id = ?', [bookingId]);

  console.log(`  -> Seeded booking #${bookingId} (Confirmed unpaid) for ${testEmail}`);

  await ensureServers({ api: true, web: true });

  let exitCode = 0;
  let browser = null;

  try {
    // Test specifically at 375px viewport (as required: "Playwright check at a 375px viewport that all buttons are visible and clickable with real clicks")
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // ─── Step 1: Login ───────────────────────────────────────────────────────
    console.log('[STEP 1] Logging in...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('.login_btn a[href="#loginform"]').click();
    await page.locator('#loginform input[name="email"]').fill(testEmail);
    await page.locator('#loginform input[name="password"]').fill(password);
    await page.locator('#loginform input[type="submit"]').click();
    await page.waitForSelector('text=Welcome To WanderWheels', { timeout: 10000 });
    console.log('  -> Logged in successfully.');

    // Switch to 375px mobile viewport for payment modal tests
    console.log('  -> Switching to 375px mobile viewport (iPhone SE width)...');
    await page.setViewportSize({ width: 375, height: 667 });

    // ─── Step 2: Navigate to My Bookings and open Payment Modal ──────────────
    console.log('\n[STEP 2] Navigating to /my-booking and opening payment modal...');
    await page.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });

    const bookingRow = page.locator(`li[data-booking-id="${bookingId}"]`);
    await bookingRow.waitFor({ state: 'visible', timeout: 10000 });

    const payNowBtn = bookingRow.locator('button:has-text("Pay now")');
    await payNowBtn.scrollIntoViewIfNeeded();
    await payNowBtn.click(); // Real click

    // Wait for payment modal dialog to appear
    const modalDialog = page.locator('.payment-modal-dialog');
    await modalDialog.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Payment modal opened at 375px viewport.');

    // ─── Step 3: Assert No Horizontal Scroll & Layout Integrity ──────────────
    console.log('\n[STEP 3] Asserting no horizontal scroll and layout responsive checks...');
    const hasHorizontalOverflow = await page.evaluate(() => {
      const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const overlay = document.querySelector('.payment-modal-overlay');
      const dialog = document.querySelector('.payment-modal-dialog');
      const overlayOverflow = overlay ? overlay.scrollWidth > overlay.clientWidth : false;
      const dialogOverflow = dialog ? dialog.scrollWidth > window.innerWidth : false;
      return docOverflow || overlayOverflow || dialogOverflow;
    });
    assert(!hasHorizontalOverflow, 'Must have NO horizontal scrolling on mobile');
    console.log('  -> Verified: NO horizontal scrolling detected (clean fit in 375px).');

    // Assert readable amount highlight
    const amountElem = page.locator('.booking-amount-highlight');
    await amountElem.waitFor({ state: 'visible', timeout: 3000 });
    const amountText = await amountElem.innerText();
    console.log(`  -> Readable Amount Highlight: "${amountText}"`);
    assert(amountText.includes('Rs.'), 'Amount must be clearly visible and formatted');

    // ─── Step 4: Check Buttons >= 44px Tall in Idle State ────────────────────
    console.log('\n[STEP 4] Checking button heights and clicking "Pay securely"...');
    const paySecurelyBtn = page.locator('.payment-modal-footer button:has-text("Pay securely")');
    const idleCloseBtn = page.locator('.payment-modal-footer button:has-text("Close")');

    await paySecurelyBtn.waitFor({ state: 'visible', timeout: 3000 });
    await idleCloseBtn.waitFor({ state: 'visible', timeout: 3000 });

    const paySecurelyHeight = await paySecurelyBtn.evaluate((el) => el.offsetHeight);
    const idleCloseHeight = await idleCloseBtn.evaluate((el) => el.offsetHeight);
    console.log(`  -> "Pay securely" button height: ${paySecurelyHeight}px (>= 44px required)`);
    console.log(`  -> "Close" button height: ${idleCloseHeight}px (>= 44px required)`);
    assert(paySecurelyHeight >= 44, 'Pay securely button must be >= 44px tall');
    assert(idleCloseHeight >= 44, 'Close button must be >= 44px tall');

    // Real click to open mock checkout
    await paySecurelyBtn.click();

    // ─── Step 5: Check Mock Checkout Popup Elements ─────────────────────────
    console.log('\n[STEP 5] Testing Mock Checkout Popup on 375px viewport...');
    const simSuccessBtn = page.locator('.mock-action-buttons button:has-text("Simulate success")');
    const simFailBtn = page.locator('.mock-action-buttons button:has-text("Simulate failure")');
    const mockCloseBtn = page.locator('.mock-action-buttons button:has-text("Close without paying")');

    await simSuccessBtn.waitFor({ state: 'visible', timeout: 5000 });
    await simFailBtn.waitFor({ state: 'visible', timeout: 5000 });
    await mockCloseBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Assert button heights >= 44px
    const successHeight = await simSuccessBtn.evaluate((el) => el.offsetHeight);
    const failHeight = await simFailBtn.evaluate((el) => el.offsetHeight);
    const mockCloseHeight = await mockCloseBtn.evaluate((el) => el.offsetHeight);

    console.log(`  -> "Simulate success" button height: ${successHeight}px (>= 44px required)`);
    console.log(`  -> "Simulate failure" button height: ${failHeight}px (>= 44px required)`);
    console.log(`  -> "Close without paying" button height: ${mockCloseHeight}px (>= 44px required)`);

    assert(successHeight >= 44, 'Simulate success button must be >= 44px tall');
    assert(failHeight >= 44, 'Simulate failure button must be >= 44px tall');
    assert(mockCloseHeight >= 44, 'Close without paying button must be >= 44px tall');

    // Real clicks on decorative mock tabs
    console.log('  -> Real clicking tabs...');
    const cardTab = page.locator('.mock-tabs a:has-text("Card (Mock)")');
    await cardTab.click();
    assert(await page.locator('input[value*="Visa Mock"]').isVisible(), 'Card input must display');

    const netTab = page.locator('.mock-tabs a:has-text("Netbanking (Mock)")');
    await netTab.click();
    assert(await page.locator('input[value*="State Bank"]').isVisible(), 'Bank input must display');

    const upiTab = page.locator('.mock-tabs a:has-text("UPI (Mock)")');
    await upiTab.click();
    assert(await page.locator('input[value*="@wanderwheels"]').isVisible(), 'UPI input must display');

    // Test Failure simulation
    console.log('  -> Real clicking "Simulate failure"...');
    await simFailBtn.click();
    const retryBtn = page.locator('button.payment-btn:has-text("Retry")');
    await retryBtn.waitFor({ state: 'visible', timeout: 5000 });
    const retryHeight = await retryBtn.evaluate((el) => el.offsetHeight);
    console.log(`  -> "Retry" button height: ${retryHeight}px (>= 44px required)`);
    assert(retryHeight >= 44, 'Retry button must be >= 44px tall');

    // Real click Retry
    await retryBtn.click();
    await paySecurelyBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Click Pay securely again to re-enter mock checkout
    await paySecurelyBtn.click();
    await simSuccessBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Test Success simulation with real click
    console.log('  -> Real clicking "Simulate success"...');
    await simSuccessBtn.click();

    // Verify success banner and View Receipt button
    const receiptBtn = page.locator('a.payment-btn:has-text("View Receipt")');
    await receiptBtn.waitFor({ state: 'visible', timeout: 8000 });
    const receiptHeight = await receiptBtn.evaluate((el) => el.offsetHeight);
    console.log(`  -> "View Receipt" button height: ${receiptHeight}px (>= 44px required)`);
    assert(receiptHeight >= 44, 'View Receipt button must be >= 44px tall');

    // Real click Close button in footer
    const successCloseBtn = page.locator('.payment-modal-footer button:has-text("Close")');
    await successCloseBtn.click();
    await modalDialog.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('  -> Modal closed cleanly with real click.');

    await context.close();

    console.log('\n================================================================');
    console.log('  MOBILE PAYMENT PLAYWRIGHT VERIFICATION PASSED SUCCESSFULLY!');
    console.log('================================================================\n');
  } catch (err) {
    exitCode = 1;
    console.error('\n[PLAYWRIGHT TEST FAILURE]:', err);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { console.error('[CLEANUP ERR]:', e); }
    }
    try { stopServers(); } catch (e) { console.error('[CLEANUP ERR]:', e); }
    if (pool) {
      try { await pool.query('DELETE FROM tblpayments WHERE booking_id = ?', [bookingId]); } catch (e) {}
      try { await pool.query('DELETE FROM tblbooking WHERE id = ?', [bookingId]); } catch (e) {}
      try { await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]); } catch (e) {}
      try { await pool.query('DELETE FROM tblbrands WHERE id = ?', [bRes.insertId]); } catch (e) {}
      try { await pool.query('DELETE FROM tblusers WHERE EmailId = ?', [testEmail]); } catch (e) {}
      try { await pool.end(); } catch (e) {}
    }
  }

  process.exit(exitCode);
}

runMobilePaymentPlaywrightTest().catch((err) => {
  console.error('[UNHANDLED E2E ERROR]:', err);
  process.exit(1);
});
