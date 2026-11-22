'use strict';

const path = require('path');
const assert = require('assert');
const mysql = require(path.join(__dirname, 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, 'carrental-admin', 'node_modules', 'playwright'));
const argon2 = require(path.join(__dirname, 'carrental-api', 'node_modules', 'argon2'));

async function runPaymentCancelRacePlaywright() {
  console.log('\n====================================================================');
  console.log('  PLAYWRIGHT 2-CONTEXT TEST: CANCEL VS IN-FLIGHT PAYMENT RACE (ITEM 3)');
  console.log('====================================================================\n');

  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'carrental_test',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const custEmail = `race_playwright_${Date.now()}@example.com`;
  const password = 'Password123!';
  let vehicleId;
  let bookingId;

  try {
    console.log('[SEED] Seeding test database...');
    const hashedPw = await argon2.hash(password);

    // Seed customer
    await pool.query(
      `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
       VALUES (?, ?, '9876543288', '', ?)`,
      ['Race Customer', custEmail, hashedPw]
    );

    // Seed brand & vehicle
    const [bRes] = await pool.query('INSERT INTO tblbrands (BrandName) VALUES (?)', [`RaceBrand_${Date.now()}`]);
    const [vRes] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
      VALUES ('RaceSedan', ?, 'Race vehicle overview', 2000, 'Petrol', 2025, 5, 'Available', 1)
    `, [bRes.insertId]);
    vehicleId = vRes.insertId;

    // Seed confirmed booking (Status = 1)
    const [bkgRes] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, '2026-12-15', '2026-12-17', 'Race booking test', 1)
    `, [custEmail, vehicleId]);
    bookingId = bkgRes.insertId;

    console.log(`  -> Customer: ${custEmail}`);
    console.log(`  -> Vehicle #${vehicleId}`);
    console.log(`  -> Booking #${bookingId} (Status=1 Confirmed)`);

    const browser = await chromium.launch({ channel: 'msedge', headless: true });

    try {
      // ── Context 1: Customer Window 1 (Opens payment popup) ─────────────────
      console.log('\n[CONTEXT 1] Customer logs in and opens payment popup...');
      const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page1 = await context1.newPage();

      // Log in in Context 1
      await page1.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      await page1.locator('.login_btn a[href="#loginform"]').click();
      await page1.locator('#loginform input[name="email"]').fill(custEmail);
      await page1.locator('#loginform input[name="password"]').fill(password);
      await page1.locator('#loginform input[type="submit"]').click();
      await page1.waitForSelector('text=Welcome To Car rental portal', { timeout: 10000 });

      // Navigate to My Bookings
      await page1.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });
      const bookingRow1 = page1.locator(`li[data-booking-id="${bookingId}"]`);
      await bookingRow1.waitFor({ state: 'visible', timeout: 10000 });

      // Click "Pay now" to open payment modal
      console.log('  -> Clicking "Pay now" in Context 1...');
      await bookingRow1.locator('button:has-text("Pay now")').click();

      // Wait for Payment Modal
      const paymentModal = page1.locator('.payment-modal-overlay');
      await paymentModal.waitFor({ state: 'visible', timeout: 10000 });
      console.log('  -> Payment modal opened in Context 1.');

      // Click "Pay securely" to create order and launch Mock Payment Simulator
      console.log('  -> Clicking "Pay securely" to create gateway order...');
      const paySecurelyBtn = paymentModal.locator('button:has-text("Pay securely")');
      await paySecurelyBtn.click();

      const mockSimulator = paymentModal.locator('text=Mock Payment Simulator');
      await mockSimulator.waitFor({ state: 'visible', timeout: 10000 });
      console.log('  -> Mock payment simulator displayed with order ready in Context 1.');

      // Verify pending payment order created in DB
      const [pPending] = await pool.query('SELECT payment_status, gateway_order_id FROM tblpayments WHERE booking_id = ?', [bookingId]);
      assert((pPending.length > 0), 'Payment order row must exist in DB');
      assert.strictEqual(pPending[0].payment_status, 'pending', 'Payment status must be pending');
      const orderId = pPending[0].gateway_order_id;
      console.log(`  -> Order created in DB: ${orderId} (Status: pending)`);

      // ── Context 2: Customer Window 2 (Cancels booking while payment is in-flight) ──
      console.log('\n[CONTEXT 2] Separate context cancelling the booking in-flight...');
      const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page2 = await context2.newPage();

      page2.on('dialog', async (dialog) => {
        console.log(`  -> Context 2 dialog: "${dialog.message()}" -> accepting`);
        await dialog.accept();
      });

      // Log in in Context 2
      await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      await page2.locator('.login_btn a[href="#loginform"]').click();
      await page2.locator('#loginform input[name="email"]').fill(custEmail);
      await page2.locator('#loginform input[name="password"]').fill(password);
      await page2.locator('#loginform input[type="submit"]').click();
      await page2.waitForSelector('text=Welcome To Car rental portal', { timeout: 10000 });

      // Cancel the booking in Context 2
      await page2.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });
      const bookingRow2 = page2.locator(`li[data-booking-id="${bookingId}"]`);
      await bookingRow2.waitFor({ state: 'visible', timeout: 10000 });

      const cancelBtn = bookingRow2.locator('.cancel-booking-btn');
      assert((await cancelBtn.count()) === 1, 'Cancel booking button must be visible');
      await cancelBtn.click();

      // Wait for success banner
      const alertSuccess = page2.locator('.alert-success');
      await alertSuccess.waitFor({ state: 'visible', timeout: 8000 });
      console.log('  -> Booking successfully cancelled in Context 2.');

      // Check DB: booking status = 2 (Cancelled) and payment order invalidated (failed)
      const [bkgCancelled] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [bookingId]);
      assert.strictEqual(bkgCancelled[0].Status, 2, 'Booking status must be 2 (Cancelled)');

      const [pInvalidated] = await pool.query('SELECT payment_status FROM tblpayments WHERE booking_id = ?', [bookingId]);
      assert.strictEqual(pInvalidated[0].payment_status, 'failed', 'Payment order must be invalidated to failed');
      console.log('  -> DB state verified: Booking is Cancelled (Status=2) and order is invalidated (failed).');

      await context2.close();

      // ── Context 1 Resumes: Simulate Payment Success NOW ─────────────────────
      console.log('\n[CONTEXT 1] Customer clicks "Simulate success" now in open popup...');
      const simulateSuccessBtn = paymentModal.locator('button:has-text("Simulate success")');
      await simulateSuccessBtn.waitFor({ state: 'visible', timeout: 5000 });
      await simulateSuccessBtn.click();

      // Wait for modal to handle response
      console.log('  -> Payment submitted. Waiting for verification result...');
      await page1.waitForTimeout(3000);

      // Verify DB state: payment MUST be flagged as 'needs_refund', NOT 'confirmed'!
      const [pFinal] = await pool.query('SELECT payment_status, failure_reason FROM tblpayments WHERE booking_id = ?', [bookingId]);
      console.log('  -> Final DB payment record:', pFinal[0]);
      assert.strictEqual(pFinal[0].payment_status, 'needs_refund', 'Payment status must be needs_refund');
      assert(
        pFinal[0].failure_reason.includes('cancelled') || pFinal[0].failure_reason.includes('refund'),
        'Failure reason must record cancellation/refund note'
      );

      // Verify booking state in DB: MUST remain 2 (Cancelled), NEVER restored to confirmed
      const [bFinal] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [bookingId]);
      assert.strictEqual(bFinal[0].Status, 2, 'Booking must remain Cancelled (Status=2)');

      // Reload Context 1 page to inspect UI
      await page1.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });
      const finalBookingRow = page1.locator(`li[data-booking-id="${bookingId}"]`);
      await finalBookingRow.waitFor({ state: 'visible', timeout: 10000 });

      // Must show Cancelled
      const statusText = await finalBookingRow.innerText();
      console.log(`  -> Booking UI text:\n${statusText}`);
      assert(statusText.includes('Cancelled'), 'Booking must display Cancelled');
      assert(!statusText.includes('Payment Status: Confirmed'), 'Cancelled booking must NEVER show Payment Status: Confirmed');

      console.log('\n====================================================================');
      console.log('  CANCEL VS IN-FLIGHT PAYMENT RACE PLAYWRIGHT TEST PASSED!');
      console.log('====================================================================\n');

      await context1.close();
    } finally {
      await browser.close();
    }
  } finally {
    if (bookingId) {
      await pool.query('DELETE FROM tblpayments WHERE booking_id = ?', [bookingId]);
      await pool.query('DELETE FROM tblbooking WHERE id = ?', [bookingId]);
    }
    if (vehicleId) {
      await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    }
    await pool.query('DELETE FROM tblusers WHERE EmailId = ?', [custEmail]);
    await pool.end();
  }
}

runPaymentCancelRacePlaywright().catch((err) => {
  console.error('\n[FATAL RACE PLAYWRIGHT TEST ERROR]:', err);
  process.exit(1);
});
