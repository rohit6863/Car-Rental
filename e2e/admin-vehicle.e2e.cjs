'use strict';
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, '..', 'carrental-admin', 'node_modules', 'playwright'));

const API_PORT = 4000;
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
let adminProcess = null;

async function startServers() {
  if (!(await checkPort(API_PORT))) {
    console.log('[STARTUP] Starting carrental-api on port 4000...');
    apiProcess = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, '..', 'carrental-api'),
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development', DB_NAME: process.env.DB_NAME || 'wanderwheels_e2e_test' },
    });
    const ok = await waitForPort(API_PORT);
    if (!ok) throw new Error('API server failed to start on port 4000');
    console.log('  -> API server ready on port 4000.');
  } else {
    console.log('  -> API server already running on port 4000.');
  }

  if (!(await checkPort(ADMIN_PORT))) {
    console.log('[STARTUP] Starting carrental-admin on port 5175...');
    adminProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'carrental-admin'),
      stdio: 'pipe',
      shell: true,
    });
    const ok = await waitForPort(ADMIN_PORT);
    if (!ok) throw new Error('Admin portal dev server failed to start on port 5175');
    console.log('  -> Admin dev server ready on port 5175.');
  } else {
    console.log('  -> Admin dev server already running on port 5175.');
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('  PLAYWRIGHT REAL BROWSER TEST: ADMIN POST VEHICLE');
  console.log('  Rule: REAL CLICKS ONLY (no force:true, no setChecked)');
  console.log('============================================================\n');

  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: process.env.DB_NAME || 'wanderwheels_e2e_test',
  });

  const uploadsDir = path.join(__dirname, '..', 'carrental-api', 'uploads', 'vehicles');
  const tempDir = path.join(__dirname, 'temp_test_assets');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // Create test assets from repo-local placeholders
  const placeholderDir = path.join(__dirname, '..', 'carrental-api', 'src', 'db', 'placeholders');
  const source1 = fs.existsSync(path.join(placeholderDir, 'toyota-fortuner-1.png'))
    ? path.join(placeholderDir, 'toyota-fortuner-1.png')
    : path.join(uploadsDir, 'toyota-fortuner-1.png');
  const source2 = fs.existsSync(path.join(placeholderDir, 'toyota-fortuner-2.png'))
    ? path.join(placeholderDir, 'toyota-fortuner-2.png')
    : path.join(uploadsDir, 'toyota-fortuner-2.png');

  const realImg1 = path.join(tempDir, 'real_1.png');
  const realImg2 = path.join(tempDir, 'real_2.png');
  fs.copyFileSync(source1, realImg1);
  fs.copyFileSync(source2, realImg2);

  // Fake image: text file renamed to .jpg
  const fakeImg = path.join(tempDir, 'fake_text_renamed.jpg');
  fs.writeFileSync(fakeImg, 'This is a plain text file pretending to be an image. Signature mismatch expected!');

  // Oversized image: 5.5 MB file
  const oversizedImg = path.join(tempDir, 'oversized_image.jpg');
  const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x5a); // 5.5 MB
  fs.writeFileSync(oversizedImg, largeBuffer);

  let browser;
  try {
    await startServers();

    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    const page = await context.newPage();

    // ─── ADMIN LOGIN ──────────────────────────────────────────
    console.log('[STEP 1] Logging in to Admin Portal (http://localhost:5175/login)...');
    const { getTestAdminCredentials } = require('./test-credentials.cjs');
    const { username: adminUser, password: adminPw } = getTestAdminCredentials();
    const argon2 = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'argon2'));
    const adminHash = await argon2.hash(adminPw);
    await pool.query('UPDATE admin SET password_hash = ?, must_change_password = 0 WHERE UserName = ?', [adminHash, adminUser]);

    await page.goto('http://localhost:5175/login', { waitUntil: 'networkidle' });
    await page.fill('#username', adminUser);
    await page.fill('#password', adminPw);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 8000 });
    console.log('  -> Admin logged in successfully. Current URL:', page.url());

    // ─── CASE (A): REAL CLICKS ON CHECKBOXES & VALID VEHICLE CREATION ────
    console.log('\n[CASE A] Real clicks on 3 accessory checkboxes & valid vehicle post...');
    await page.goto('http://localhost:5175/post-vehicle', { waitUntil: 'networkidle' });

    // Assert checkboxes start unchecked
    assert.strictEqual(await page.isChecked('#airconditioner'), false, 'airconditioner should start unchecked');
    assert.strictEqual(await page.isChecked('#powerdoorlocks'), false, 'powerdoorlocks should start unchecked');
    assert.strictEqual(await page.isChecked('#leatherseats'), false, 'leatherseats should start unchecked');

    // REAL CLICKS: Click the label for Air Conditioner, Power Door Locks, and Leather Seats
    console.log('  -> Clicking label[for="airconditioner"] with REAL mouse click...');
    await page.click('label[for="airconditioner"]');
    assert.strictEqual(await page.isChecked('#airconditioner'), true, 'airconditioner must become checked after click');
    console.log('     PASS: Air Conditioner is checked: true');

    console.log('  -> Clicking label[for="powerdoorlocks"] with REAL mouse click...');
    await page.click('label[for="powerdoorlocks"]');
    assert.strictEqual(await page.isChecked('#powerdoorlocks'), true, 'powerdoorlocks must become checked after click');
    console.log('     PASS: Power Door Locks is checked: true');

    console.log('  -> Clicking label[for="leatherseats"] with REAL mouse click...');
    await page.click('label[for="leatherseats"]');
    assert.strictEqual(await page.isChecked('#leatherseats'), true, 'leatherseats must become checked after click');
    console.log('     PASS: Leather Seats is checked: true');

    // Assert other accessories remain unchecked
    assert.strictEqual(await page.isChecked('#cdplayer'), false, 'cdplayer must remain unchecked');
    assert.strictEqual(await page.isChecked('#brakeassist'), false, 'brakeassist must remain unchecked');

    // Fill vehicle details
    const testTitle = 'PW Test Sedan ' + Date.now();
    console.log(`  -> Filling vehicle form with title: "${testTitle}"...`);
    await page.fill('input[name="vehicletitle"]', testTitle);
    await page.selectOption('select[name="brandname"]', '1');
    await page.fill('textarea[name="vehicalorcview"]', 'Premium sedan equipped with genuine accessories for testing.');
    await page.fill('input[name="priceperday"]', '3500');
    await page.selectOption('select[name="fueltype"]', 'Petrol');
    await page.fill('input[name="modelyear"]', '2024');
    await page.fill('input[name="seatingcapacity"]', '5');

    // Attach real images
    await page.setInputFiles('input[name="img1"]', realImg1);
    await page.setInputFiles('input[name="img2"]', realImg2);

    console.log('  -> Submitting valid vehicle post with real images...');
    await page.click('button[name="submit"]');

    // Verify success banner and redirection
    await page.waitForURL((url) => url.pathname.includes('/manage-vehicles'), { timeout: 10000 });
    console.log('  -> Redirected to:', page.url());

    // Verify vehicle appears in Manage Vehicles table
    const tableText = await page.locator('table').innerText();
    assert(tableText.includes(testTitle), `Vehicle "${testTitle}" must appear in the vehicle table`);
    console.log('  -> PASS: Vehicle appears in Manage Vehicles table!');

    // Verify in database that accessories are correctly saved
    const [rows] = await pool.query(
      'SELECT AirConditioner, PowerDoorLocks, LeatherSeats, CDPlayer, BrakeAssist FROM tblvehicles WHERE VehiclesTitle = ?',
      [testTitle]
    );
    assert(rows.length > 0, 'Vehicle record must exist in tblvehicles');
    assert.strictEqual(rows[0].AirConditioner, 1, 'AirConditioner must be 1 in DB');
    assert.strictEqual(rows[0].PowerDoorLocks, 1, 'PowerDoorLocks must be 1 in DB');
    assert.strictEqual(rows[0].LeatherSeats, 1, 'LeatherSeats must be 1 in DB');
    assert.strictEqual(rows[0].CDPlayer, 0, 'CDPlayer must be 0 in DB');
    assert.strictEqual(rows[0].BrakeAssist, 0, 'BrakeAssist must be 0 in DB');
    console.log('  -> PASS: Database confirmed accessory values (AC: 1, Locks: 1, Leather: 1, CD: 0, Brake: 0)!');

    // ─── CASE (B): RENAMED .TXT FILE AS .JPG REJECTED & CLEANED UP ────────
    console.log('\n[CASE B] Testing renamed text file as .jpg...');
    await page.goto('http://localhost:5175/post-vehicle', { waitUntil: 'networkidle' });

    await page.fill('input[name="vehicletitle"]', 'Fake Image Reject Car');
    await page.selectOption('select[name="brandname"]', '1');
    await page.fill('textarea[name="vehicalorcview"]', 'Test description for fake image rejection.');
    await page.fill('input[name="priceperday"]', '2000');
    await page.selectOption('select[name="fueltype"]', 'Petrol');
    await page.fill('input[name="modelyear"]', '2023');
    await page.fill('input[name="seatingcapacity"]', '4');

    // Image 1 valid, Image 2 renamed .txt file
    await page.setInputFiles('input[name="img1"]', realImg1);
    await page.setInputFiles('input[name="img2"]', fakeImg);

    const uploadsBeforeCount = fs.readdirSync(uploadsDir).length;

    await page.click('button[name="submit"]');

    // Wait for error wrap
    const errorBoxB = page.locator('.errorWrap');
    await errorBoxB.waitFor({ timeout: 6000 });
    const errorMsgB = await errorBoxB.innerText();
    console.log('  -> Error banner text:\n     "' + errorMsgB + '"');
    assert(
      errorMsgB.includes('Image 2 is not a valid JPEG, PNG, or WEBP file'),
      'Must display clear error naming Image 2 signature mismatch'
    );
    console.log('  -> PASS: Rejection message clearly identifies Image 2 invalid format!');

    // Verify no orphaned file left in uploadsDir
    const uploadsAfterCount = fs.readdirSync(uploadsDir).length;
    assert.strictEqual(uploadsAfterCount, uploadsBeforeCount, 'No orphaned file should be left on disk after error');
    console.log('  -> PASS: Verified no invalid or partial files left on disk!');

    // ─── CASE (C): MISSING REQUIRED FIELD SHOWS ITS MESSAGE ───────────────
    console.log('\n[CASE C] Testing missing required fields (images / text fields)...');
    await page.goto('http://localhost:5175/post-vehicle', { waitUntil: 'networkidle' });

    // Test (c1): Missing images
    await page.fill('input[name="vehicletitle"]', 'Missing Images Car');
    await page.selectOption('select[name="brandname"]', '1');
    await page.fill('textarea[name="vehicalorcview"]', 'Testing missing required images banner.');
    await page.fill('input[name="priceperday"]', '2200');
    await page.selectOption('select[name="fueltype"]', 'Diesel');
    await page.fill('input[name="modelyear"]', '2022');
    await page.fill('input[name="seatingcapacity"]', '5');
    // Submit without selecting Image 1 and Image 2
    await page.click('button[name="submit"]');

    const errorBoxC1 = page.locator('.errorWrap');
    await errorBoxC1.waitFor({ timeout: 5000 });
    const errorMsgC1 = await errorBoxC1.innerText();
    console.log('  -> Missing image error banner:\n     "' + errorMsgC1 + '"');
    assert(
      errorMsgC1.includes('Image 1') && errorMsgC1.includes('required'),
      'Must name Image 1 is required'
    );
    console.log('  -> PASS: Clear message displayed for missing required images!');

    // Test (c2): Field-level validation message for negative price per day
    console.log('  -> Verifying API field-level validation message for invalid price per day (-100)...');
    await page.setInputFiles('input[name="img1"]', realImg1);
    await page.setInputFiles('input[name="img2"]', realImg2);
    await page.fill('input[name="priceperday"]', '-100');
    await page.click('button[name="submit"]');

    await page.waitForFunction(
      () => {
        const el = document.querySelector('.errorWrap');
        return el && el.innerText.includes('Price per day must be positive');
      },
      { timeout: 8000 }
    );
    const errorMsgC2 = await page.locator('.errorWrap').innerText();
    console.log('  -> Invalid price per day error banner:\n     "' + errorMsgC2 + '"');
    assert(
      errorMsgC2.includes('Price per day must be positive'),
      'Must state Price per day must be positive'
    );
    console.log('  -> PASS: Clear field-level message displayed: "Price per day must be positive"!');

    // ─── CASE (D): FILE OVER 5 MB IS REJECTED ─────────────────────────────
    console.log('\n[CASE D] Testing file over 5 MB rejection...');
    await page.goto('http://localhost:5175/post-vehicle', { waitUntil: 'networkidle' });

    await page.fill('input[name="vehicletitle"]', 'Oversized File Reject Car');
    await page.selectOption('select[name="brandname"]', '1');
    await page.fill('textarea[name="vehicalorcview"]', 'Testing oversized 5.5 MB image rejection.');
    await page.fill('input[name="priceperday"]', '2500');
    await page.selectOption('select[name="fueltype"]', 'Petrol');
    await page.fill('input[name="modelyear"]', '2023');
    await page.fill('input[name="seatingcapacity"]', '4');

    await page.setInputFiles('input[name="img1"]', realImg1);
    await page.setInputFiles('input[name="img2"]', oversizedImg); // 5.5 MB

    const uploadsBeforeD = fs.readdirSync(uploadsDir).length;
    await page.click('button[name="submit"]');

    const errorBoxD = page.locator('.errorWrap');
    await errorBoxD.waitFor({ timeout: 8000 });
    const errorMsgD = await errorBoxD.innerText();
    console.log('  -> Oversized file error banner:\n     "' + errorMsgD + '"');
    assert(
      errorMsgD.includes('5 MB') || errorMsgD.includes('File too large'),
      'Must state file too large (5 MB limit)'
    );
    console.log('  -> PASS: File over 5 MB clearly rejected with 5 MB limit message!');

    const uploadsAfterD = fs.readdirSync(uploadsDir).length;
    assert.strictEqual(uploadsAfterD, uploadsBeforeD, 'No oversized file should remain on disk');
    console.log('  -> PASS: Verified no oversized file was left on disk!');

    // ─── CLEANUP ──────────────────────────────────────────────────────────
    console.log('\n[CLEANUP] Cleaning up test vehicle records from database...');
    await pool.query('DELETE FROM tblvehicles WHERE VehiclesTitle LIKE "PW Test Sedan %"');
    console.log('  -> Cleaned up test vehicles.');

    console.log('\n============================================================');
    console.log('  SUCCESS: ALL 4 POST-VEHICLE PLAYWRIGHT CASES PASSED 100%!');
    console.log('============================================================\n');
  } finally {
    if (browser) await browser.close();
    await pool.end();

    // Clean up temp test assets
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    const { killPid } = require('./server-helper.cjs');
    if (adminProcess) {
      console.log('[CLEANUP] Stopping admin dev server...');
      killPid(adminProcess.pid);
    }
    if (apiProcess) {
      console.log('[CLEANUP] Stopping API server...');
      killPid(apiProcess.pid);
    }
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('\n[FATAL ERROR]', err);
  const { killPid } = require('./server-helper.cjs');
  if (adminProcess) killPid(adminProcess.pid);
  if (apiProcess) killPid(apiProcess.pid);
  process.exit(1);
});
