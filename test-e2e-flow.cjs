const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require(path.join(__dirname, 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, 'carrental-admin', 'node_modules', 'playwright'));
const assert = require('assert');

const API_PORT = 4000;
const ADMIN_PORT = 5175;
const PARITY_DIR = path.join(__dirname, 'parity', 'admin');

if (!fs.existsSync(PARITY_DIR)) {
  fs.mkdirSync(PARITY_DIR, { recursive: true });
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForPort(port, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkPort(port)) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

let apiProcess = null;
let adminProcess = null;

async function startServers() {
  const apiRunning = await checkPort(API_PORT);
  if (!apiRunning) {
    console.log('[STARTUP] Starting carrental-api on port 4000...');
    apiProcess = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, 'carrental-api'),
      stdio: 'pipe',
      shell: true,
    });
    apiProcess.stderr.on('data', (d) => console.error('[API ERR]:', d.toString()));
    const ok = await waitForPort(API_PORT);
    if (!ok) throw new Error('carrental-api failed to start on port 4000');
    console.log('  -> carrental-api is ready.');
  } else {
    console.log('  -> carrental-api is already running on port 4000.');
  }

  const adminRunning = await checkPort(ADMIN_PORT);
  if (!adminRunning) {
    console.log('[STARTUP] Starting carrental-admin on port 5175...');
    adminProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, 'carrental-admin'),
      stdio: 'pipe',
      shell: true,
    });
    adminProcess.stderr.on('data', (d) => console.error('[ADMIN ERR]:', d.toString()));
    const ok = await waitForPort(ADMIN_PORT);
    if (!ok) throw new Error('carrental-admin failed to start on port 5175');
    console.log('  -> carrental-admin is ready on port 5175.');
  } else {
    console.log('  -> carrental-admin is already running on port 5175.');
  }
}

async function runTestFlow() {
  console.log('\n================================================================');
  console.log('  E2E FLOW TEST: TWO OVERLAPPING BOOKINGS CONFIRMATION RACE');
  console.log('================================================================\n');

  // Connect to DB
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'carrental_test',
    waitForConnections: true,
    connectionLimit: 5,
  });

  let testBrandId, testVehicleId, bookingId1, bookingId2;

  try {
    await startServers();

    console.log('[STEP 1] Seeding test database with 2 customers, 1 vehicle, and 2 overlapping pending bookings...');

    // 1. Ensure 2 test customers exist
    const cust1Email = 'cust1_race@example.com';
    const cust2Email = 'cust2_race@example.com';

    await pool.query(
      'INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)',
      ['Customer One', cust1Email, '9999911111', 'password']
    );
    await pool.query(
      'INSERT IGNORE INTO tblusers (FullName, EmailId, ContactNo, Password) VALUES (?, ?, ?, ?)',
      ['Customer Two', cust2Email, '9999922222', 'password']
    );

    // 2. Ensure test brand and vehicle exist
    const [bRes] = await pool.query(
      'INSERT INTO tblbrands (BrandName) VALUES (?)',
      [`RaceFlowBrand_${Date.now()}`]
    );
    testBrandId = bRes.insertId;

    const [vRes] = await pool.query(`
      INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', 1)
    `, ['ConflictRaceVehicle', testBrandId, 'Test Vehicle for Race Condition Flow', 2500, 'Petrol', 2024, 5]);
    testVehicleId = vRes.insertId;

    // 3. Create 2 overlapping Pending bookings (Status = 0)
    // Booking 1: 2026-12-10 to 2026-12-15
    const [bk1Res] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, '2026-12-10', '2026-12-15', 'Customer 1 Booking Flow', 0)
    `, [cust1Email, testVehicleId]);
    bookingId1 = bk1Res.insertId;

    // Booking 2: 2026-12-12 to 2026-12-18 (OVERLAPS 2026-12-10..2026-12-15!)
    const [bk2Res] = await pool.query(`
      INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
      VALUES (?, ?, '2026-12-12', '2026-12-18', 'Customer 2 Booking Flow Overlap', 0)
    `, [cust2Email, testVehicleId]);
    bookingId2 = bk2Res.insertId;

    console.log(`  -> Vehicle ID: ${testVehicleId}`);
    console.log(`  -> Booking 1 (Customer 1): ID #${bookingId1} (2026-12-10 to 2026-12-15, Status=0)`);
    console.log(`  -> Booking 2 (Customer 2): ID #${bookingId2} (2026-12-12 to 2026-12-18, Status=0)`);

    // 4. Launch Playwright browser
    console.log('\n[STEP 2] Launching browser & logging in as Admin...');
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    let dialogCount = 0;
    page.on('dialog', async (dialog) => {
      dialogCount++;
      console.log(`  [BROWSER DIALOG #${dialogCount} ACCEPTED]: "${dialog.message()}"`);
      await dialog.accept();
    });

    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'AdminPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes('/dashboard') || url.pathname.includes('/change-password'), { timeout: 10000 });

    if (page.url().includes('change-password')) {
      console.log('  -> Admin must change password on first login...');
      await page.fill('#password', 'AdminPassword123!');
      await page.fill('#newpassword', 'AdminPassword123!');
      await page.fill('#confirmpassword', 'AdminPassword123!');
      await page.click('button[name="submit"]');
      await page.waitForTimeout(1000);
      await page.goto('http://localhost:5175/dashboard', { waitUntil: 'networkidle' });
    }

    console.log('  -> Admin logged in successfully.');

    // 5. Navigate to Manage Bookings
    console.log('\n[STEP 3] Navigating to /manage-bookings...');
    await page.goto('http://localhost:5175/manage-bookings', { waitUntil: 'networkidle' });

    // Verify both bookings appear in table
    const tableHtml = await page.content();
    assert(tableHtml.includes('Customer 1 Booking Flow'), 'Booking 1 must be visible in table');
    assert(tableHtml.includes('Customer 2 Booking Flow Overlap'), 'Booking 2 must be visible in table');
    console.log('  -> Verified both Booking 1 and Booking 2 are listed.');

    // 6. Admin confirms Booking 1 (expect SUCCESS)
    console.log(`\n[STEP 4] Admin confirms Booking 1 (ID #${bookingId1})...`);
    // Find row for Booking 1 and click Confirm
    const booking1Row = page.locator(`tr:has-text("Customer 1 Booking Flow")`);
    const confirmBtn1 = booking1Row.locator('a:has-text("Confirm")');
    await confirmBtn1.click();

    // Wait for success alert
    await page.waitForSelector('.succWrap', { timeout: 8000 });
    const successText = await page.locator('.succWrap').innerText();
    console.log('  -> Success banner visible:', successText);
    assert(successText.includes('Booking Confirmed and Vehicle Marked as Rented'), 'Expected confirmation success message');

    // Verify Booking 1 status changed to Confirmed
    await page.waitForTimeout(1000);
    const updatedRow1 = page.locator(`tr:has-text("Customer 1 Booking Flow")`);
    const statusText1 = await updatedRow1.innerText();
    assert(statusText1.includes('Confirmed'), 'Booking 1 status must now be Confirmed');
    console.log('  -> Booking 1 status in UI: Confirmed.');

    // 7. Admin attempts to confirm Booking 2 (overlapping dates) (expect CONFLICT ERROR BANNER)
    console.log(`\n[STEP 5] Admin confirms overlapping Booking 2 (ID #${bookingId2})...`);
    const booking2Row = page.locator(`tr:has-text("Customer 2 Booking Flow Overlap")`);
    const confirmBtn2 = booking2Row.locator('a:has-text("Confirm")');
    await confirmBtn2.click();

    // Wait for error banner
    await page.waitForSelector('.errorWrap', { timeout: 8000 });
    const errorBanner = page.locator('.errorWrap');
    const errorText = await errorBanner.innerText();
    console.log('  -> Error banner text visible:\n     ', errorText);

    // Assert that the error banner text contains clear conflict information
    assert(
      errorText.includes('Cannot confirm: this vehicle is already booked for overlapping dates'),
      'Error banner must state vehicle is already booked for overlapping dates'
    );
    assert(
      errorText.includes(String(bookingId1)),
      `Error banner must mention conflicting booking ID #${bookingId1}`
    );
    assert(
      errorText.includes('2026-12-10') && errorText.includes('2026-12-15'),
      'Error banner must include the conflicting booking dates'
    );
    console.log('  -> PASS: Conflict error banner displays clear message with conflicting booking ID and dates!');

    // 8. Assert that Booking 2 remained unconfirmed (Pending / Not Confirmed)
    console.log('\n[STEP 6] Verifying Booking 2 status remained Pending in UI and DB...');
    const updatedRow2 = page.locator(`tr:has-text("Customer 2 Booking Flow Overlap")`);
    const statusText2 = await updatedRow2.innerText();
    assert(statusText2.includes('Not Confirmed'), 'Booking 2 status must remain Not Confirmed (Pending)');
    console.log('  -> PASS: UI shows Booking 2 remained Not Confirmed!');

    // Verify DB state directly
    const [dbBk1] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [bookingId1]);
    const [dbBk2] = await pool.query('SELECT Status FROM tblbooking WHERE id = ?', [bookingId2]);
    const [dbVeh] = await pool.query('SELECT vehicle_status FROM tblvehicles WHERE id = ?', [testVehicleId]);

    assert.strictEqual(dbBk1[0].Status, 1, 'Booking 1 in DB must be 1 (Confirmed)');
    assert.strictEqual(dbBk2[0].Status, 0, 'Booking 2 in DB must be 0 (Pending)');
    assert.strictEqual(dbVeh[0].vehicle_status, 'Rented', 'Vehicle status in DB must be Rented');
    console.log('  -> PASS: DB verified: Booking 1 = Confirmed (1), Booking 2 = Pending (0), Vehicle = Rented.');

    // 9. Save screenshot of the error banner in parity folder
    const screenshotPath = path.join(PARITY_DIR, 'double_booking_race_conflict_banner.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`  -> Screenshot saved: ${screenshotPath}`);

    await browser.close();

    console.log('\n================================================================');
    console.log('  SUCCESS: ALL DOUBLE-BOOKING RACE SCENARIOS VERIFIED 100%!');
    console.log('================================================================\n');
  } finally {
    // Cleanup seeded data
    console.log('[CLEANUP] Cleaning up test bookings and vehicle...');
    if (testVehicleId) {
      await pool.query('DELETE FROM tblbooking WHERE VehicleId = ?', [testVehicleId]);
      await pool.query('DELETE FROM tblvehicles WHERE id = ?', [testVehicleId]);
    }
    if (testBrandId) {
      await pool.query('DELETE FROM tblbrands WHERE id = ?', [testBrandId]);
    }
    await pool.query('DELETE FROM tblusers WHERE EmailId IN (?, ?)', ['cust1_race@example.com', 'cust2_race@example.com']);
    await pool.end();

    if (adminProcess) {
      console.log('[CLEANUP] Stopping admin dev server...');
      adminProcess.kill();
    }
    if (apiProcess) {
      console.log('[CLEANUP] Stopping api server...');
      apiProcess.kill();
    }
  }
}

runTestFlow().catch((err) => {
  console.error('\n[FLOW TEST FAILURE]:', err);
  process.exit(1);
});
