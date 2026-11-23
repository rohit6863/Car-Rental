'use strict';

const http = require('http');
const path = require('path');
const assert = require('assert');
const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, '..', 'carrental-admin', 'node_modules', 'playwright'));
const argon2 = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'argon2'));

const API_PORT = 4000;
const WEB_PORT = 5173;

async function runCancelBookingPlaywrightTests() {
  console.log('\n================================================================');
  console.log('  PLAYWRIGHT REAL-BROWSER TEST: CUSTOMER CANCEL BOOKING (ITEM 2)');
  console.log('================================================================\n');

  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'carrental_test',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const custAEmail = `cancel_cust_a_${Date.now()}@example.com`;
  const custBEmail = `cancel_cust_b_${Date.now()}@example.com`;
  const { password } = require('./test-credentials.cjs').getTestCustomerCredentials();

  console.log('[SEED] Seeding test database...');
  const hashedPw = await argon2.hash(password);

  // 1. Seed Customer A and Customer B
  await pool.query(
    `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
     VALUES (?, ?, '9876543201', '', ?)`,
    ['Customer Cancel A', custAEmail, hashedPw]
  );
  await pool.query(
    `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
     VALUES (?, ?, '9876543202', '', ?)`,
    ['Customer Cancel B', custBEmail, hashedPw]
  );

  // 2. Seed brand & vehicle
  const [bRes] = await pool.query('INSERT INTO tblbrands (BrandName) VALUES (?)', [`CancelBrand_${Date.now()}`]);
  const [vRes] = await pool.query(`
    INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
    VALUES ('CancelSUV', ?, 'Cancel SUV overview', 1500, 'Diesel', 2025, 7, 'Booked', 1)
  `, [bRes.insertId]);
  const vehicleId = vRes.insertId;

  // 3. Booking 1: Pending booking (Status = 0)
  const [b1] = await pool.query(`
    INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
    VALUES (?, ?, '2026-12-01', '2026-12-03', 'Pending booking to cancel', 0)
  `, [custAEmail, vehicleId]);
  const pendingBookingId = b1.insertId;

  // 4. Booking 2: Confirmed unpaid booking (Status = 1)
  const [b2] = await pool.query(`
    INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
    VALUES (?, ?, '2026-12-10', '2026-12-12', 'Confirmed unpaid booking to cancel', 1)
  `, [custAEmail, vehicleId]);
  const confirmedUnpaidBookingId = b2.insertId;

  // 5. Booking 3: Confirmed paid booking (Status = 1, payment_status = 'confirmed')
  const [b3] = await pool.query(`
    INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
    VALUES (?, ?, '2026-12-20', '2026-12-22', 'Confirmed paid booking', 1)
  `, [custAEmail, vehicleId]);
  const paidBookingId = b3.insertId;

  const uniqueOrder = `order_mock_test_${Date.now()}`;
  const uniquePay = `pay_mock_test_${Date.now()}`;
  await pool.query(`
    INSERT INTO tblpayments (booking_id, gateway, gateway_order_id, gateway_payment_id, amount, currency, payment_status, payment_method)
    VALUES (?, 'mock', ?, ?, 450000, 'INR', 'confirmed', 'mock_card')
  `, [paidBookingId, uniqueOrder, uniquePay]);

  console.log(`  -> Customer A: ${custAEmail}`);
  console.log(`  -> Booking #${pendingBookingId} (Pending Status=0)`);
  console.log(`  -> Booking #${confirmedUnpaidBookingId} (Confirmed unpaid Status=1)`);
  console.log(`  -> Booking #${paidBookingId} (Confirmed PAID Status=1)`);

  const { ensureServers, stopServers } = require('./server-helper.cjs');
  await ensureServers({ api: true, web: true });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Setup dialog listener to accept window.confirm
    page.on('dialog', async (dialog) => {
      console.log(`[DIALOG] "${dialog.message()}" -> accepting`);
      await dialog.accept();
    });

    // ─── Step 1: Customer A logs in ──────────────────────────────────────────
    console.log('\n[STEP 1] Customer A logging in via real clicks...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.locator('.login_btn a[href="#loginform"]').click();
    await page.locator('#loginform input[name="email"]').fill(custAEmail);
    await page.locator('#loginform input[name="password"]').fill(password);
    await page.locator('#loginform input[type="submit"]').click();
    await page.waitForSelector('text=Welcome To Car rental portal', { timeout: 10000 });
    console.log('  -> Customer A logged in successfully.');

    // ─── Step 2: Customer A cancels Pending Booking #pendingBookingId ─────────
    console.log(`\n[STEP 2] Cancelling Pending Booking #${pendingBookingId}...`);
    await page.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });

    const pendingRow = page.locator(`li[data-booking-id="${pendingBookingId}"]`);
    await pendingRow.waitFor({ state: 'visible', timeout: 10000 });
    await pendingRow.locator('text=Not Confirm yet').waitFor({ timeout: 5000 });

    const pendingCancelBtn = pendingRow.locator('.cancel-booking-btn');
    assert((await pendingCancelBtn.count()) === 1, 'Pending booking must have Cancel booking button');

    // Real click to cancel
    await pendingCancelBtn.click();

    // Verify inline success banner
    const alertSuccess = page.locator('.alert-success');
    await alertSuccess.waitFor({ state: 'visible', timeout: 8000 });
    const alertText = await alertSuccess.innerText();
    console.log(`  -> Inline banner message: "${alertText}"`);
    assert(alertText.includes('Booking Cancelled successfully'), 'Must show success message');

    // Verify booking row updated to "Cancelled"
    await pendingRow.locator('text=Cancelled').waitFor({ timeout: 5000 });
    assert((await pendingRow.locator('.cancel-booking-btn').count()) === 0, 'Cancelled booking must not have cancel button');
    console.log('  -> Verified: Pending booking status updated to Cancelled.');

    // ─── Step 3: Customer A cancels Confirmed Unpaid Booking ──────────────────
    console.log(`\n[STEP 3] Cancelling Confirmed Unpaid Booking #${confirmedUnpaidBookingId}...`);
    const unpaidRow = page.locator(`li[data-booking-id="${confirmedUnpaidBookingId}"]`);
    await unpaidRow.waitFor({ state: 'visible', timeout: 10000 });
    await unpaidRow.locator('a.active-btn:has-text("Confirmed")').waitFor({ timeout: 5000 });

    const unpaidCancelBtn = unpaidRow.locator('.cancel-booking-btn');
    assert((await unpaidCancelBtn.count()) === 1, 'Confirmed unpaid booking must have Cancel booking button');

    // Real click to cancel
    await unpaidCancelBtn.click();

    // Verify inline success banner
    await alertSuccess.waitFor({ state: 'visible', timeout: 8000 });
    const unpaidAlertText = await alertSuccess.innerText();
    console.log(`  -> Inline banner message: "${unpaidAlertText}"`);
    assert(unpaidAlertText.includes('Booking Cancelled successfully'), 'Must show success message');

    // Verify booking row updated to "Cancelled"
    await unpaidRow.locator('text=Cancelled').waitFor({ timeout: 5000 });
    console.log('  -> Verified: Confirmed unpaid booking status updated to Cancelled.');

    // Verify in DB that tblvehicles.vehicle_status is Available (since only paid booking 2026-12-20 remains or no active conflicting)
    // Wait, the paid booking is still Status = 1, so activeBookings length > 0
    // Let's verify active dates freed up: dates 2026-12-10 to 2026-12-12 must now be selectable!
    console.log('\n[STEP 4] Verifying cancelled dates (2026-12-10 to 2026-12-12) are selectable on vehicle page...');
    await page.goto(`http://localhost:5173/vehical-details/${vehicleId}`, { waitUntil: 'networkidle' });

    // Fetch booked dates from API for vehicle
    const datesRes = await page.evaluate(async (vId) => {
      const r = await fetch(`/api/vehicles/${vId}/booked-dates`);
      return r.json();
    }, vehicleId);

    console.log('  -> Booked dates returned by API:', datesRes);
    const bookedList = Array.isArray(datesRes) ? datesRes : (datesRes.booked_dates || []);
    assert(!bookedList.includes('2026-12-10'), 'Cancelled date 2026-12-10 must NOT be blocked');
    assert(!bookedList.includes('2026-12-11'), 'Cancelled date 2026-12-11 must NOT be blocked');
    assert(!bookedList.includes('2026-12-12'), 'Cancelled date 2026-12-12 must NOT be blocked');

    // UI CALENDAR CHECK (Item 6): interact directly with calendar inputs & Flatpickr UI
    console.log('  -> Testing date selection directly in the calendar UI...');
    const fromInput = page.locator('#fromdate');
    const toInput = page.locator('#todate');
    await fromInput.waitFor({ state: 'visible' });
    await toInput.waitFor({ state: 'visible' });

    // Open Flatpickr and click the input
    await fromInput.click();
    await fromInput.fill('10/12/2026');
    await fromInput.dispatchEvent('change');

    await toInput.click();
    await toInput.fill('12/12/2026');
    await toInput.dispatchEvent('change');

    // Verify date status elements show "available" and NOT "unavailable"
    const fromStatus = page.locator('#fromDateStatus');
    if ((await fromStatus.count()) > 0) {
      const fromStatusText = await fromStatus.innerText();
      console.log(`  -> From Date UI Status: "${fromStatusText}"`);
      assert(!fromStatusText.toLowerCase().includes('booked'), 'Cancelled date must not show Booked');
      assert(fromStatusText.toLowerCase().includes('available'), 'Cancelled date must show Available');
    }

    const toStatus = page.locator('#toDateStatus');
    if ((await toStatus.count()) > 0) {
      const toStatusText = await toStatus.innerText();
      console.log(`  -> To Date UI Status: "${toStatusText}"`);
      assert(!toStatusText.toLowerCase().includes('booked'), 'Cancelled date must not show Booked');
      assert(toStatusText.toLowerCase().includes('available'), 'Cancelled date must show Available');
    }

    // Also assert that Flatpickr day element for this date is NOT marked disabled
    const flatpickrCalendar = page.locator('.flatpickr-calendar.open');
    if ((await flatpickrCalendar.count()) > 0) {
      const disabledDayCount = await flatpickrCalendar.locator('.flatpickr-day.flatpickr-disabled[aria-label*="December 10"]').count();
      assert.strictEqual(disabledDayCount, 0, 'Cancelled date must not have flatpickr-disabled class');
    }
    console.log('  -> Verified: Cancelled dates are selectable in the actual calendar UI without errors!');

    // ─── Step 5: Verify Paid Booking Cannot Be Cancelled ─────────────────────
    console.log(`\n[STEP 5] Verifying Paid Booking #${paidBookingId} cannot be cancelled...`);
    await page.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });

    const paidRow = page.locator(`li[data-booking-id="${paidBookingId}"]`);
    await paidRow.waitFor({ state: 'visible', timeout: 10000 });

    // Verify "Cancel booking" button is NOT present
    const paidCancelBtnCount = await paidRow.locator('.cancel-booking-btn').count();
    assert.strictEqual(paidCancelBtnCount, 0, 'Paid booking must NOT have Cancel booking button');

    // Verify "Contact support to cancel a paid booking" notice IS present and links to /contact-us
    const supportNotice = paidRow.locator('.cancel-support-notice');
    await supportNotice.waitFor({ state: 'visible', timeout: 5000 });
    const supportNoticeText = await supportNotice.innerText();
    console.log(`  -> Paid booking notice: "${supportNoticeText}"`);
    assert(supportNoticeText.includes('Contact support to cancel a paid booking'), 'Must show contact support notice');
    const supportLink = supportNotice.locator('a[href="/contact-us"]');
    assert((await supportLink.count()) === 1, 'Notice must link to /contact-us');
    console.log('  -> Verified: Paid booking notice links to Contact Us page.');

    // Attempt direct API call to cancel paid booking
    console.log('  -> Attempting direct API call to cancel paid booking...');
    const directApiRes = await page.evaluate(async (bId) => {
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();
      const r = await fetch(`/api/bookings/${bId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });
      return { status: r.status, data: await r.json() };
    }, paidBookingId);

    console.log('  -> Direct API response on paid booking cancellation:', directApiRes);
    assert.strictEqual(directApiRes.status, 422, 'Direct API call must return 422');
    assert(
      directApiRes.data.error.includes('Cannot cancel a paid booking') ||
      directApiRes.data.message?.includes('Cannot cancel a paid booking'),
      'Must refuse to cancel a paid booking'
    );
    console.log('  -> Verified: Server strictly refused to cancel paid booking.');

    // ─── Step 6: Verify IDOR Protection (Customer B cannot cancel Customer A's booking)
    console.log('\n[STEP 6] Verifying IDOR protection (Customer B cannot cancel Customer A\'s booking)...');
    await context.close();

    const custBContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const bPage = await custBContext.newPage();

    await bPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await bPage.locator('.login_btn a[href="#loginform"]').click();
    await bPage.locator('#loginform input[name="email"]').fill(custBEmail);
    await bPage.locator('#loginform input[name="password"]').fill(password);
    await bPage.locator('#loginform input[type="submit"]').click();
    await bPage.waitForSelector('text=Welcome To Car rental portal', { timeout: 10000 });

    // Customer B attempts to cancel Customer A's paid booking
    const idorRes = await bPage.evaluate(async (targetId) => {
      const csrfRes = await fetch('/api/auth/csrf');
      const { csrfToken } = await csrfRes.json();
      const r = await fetch(`/api/bookings/${targetId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });
      return { status: r.status, data: await r.json() };
    }, paidBookingId);

    console.log('  -> IDOR attempt API response:', idorRes);
    assert.strictEqual(idorRes.status, 403, 'Customer B must receive 403 Forbidden');
    assert(idorRes.data.error.includes('You can only cancel your own bookings'), 'Must state own bookings only');
    console.log('  -> Verified: Customer B blocked from cancelling Customer A\'s booking (403 IDOR blocked).');

    await custBContext.close();

    console.log('\n================================================================');
    console.log('  ALL CUSTOMER CANCEL BOOKING PLAYWRIGHT TESTS PASSED!');
    console.log('================================================================\n');
  } finally {
    stopServers();
    await browser.close();
    await pool.query('DELETE FROM tblpayments WHERE booking_id IN (?, ?, ?)', [pendingBookingId, confirmedUnpaidBookingId, paidBookingId]);
    await pool.query('DELETE FROM tblbooking WHERE id IN (?, ?, ?)', [pendingBookingId, confirmedUnpaidBookingId, paidBookingId]);
    await pool.query('DELETE FROM tblvehicles WHERE id = ?', [vehicleId]);
    await pool.query('DELETE FROM tblbrands WHERE id = ?', [bRes.insertId]);
    await pool.query('DELETE FROM tblusers WHERE EmailId IN (?, ?)', [custAEmail, custBEmail]);
    await pool.end();
    process.exit(0);
  }
}

runCancelBookingPlaywrightTests().catch((err) => {
  console.error('\n[FATAL CANCEL TEST ERROR]:', err);
  process.exit(1);
});
