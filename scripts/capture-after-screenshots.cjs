'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, '..', 'carrental-admin', 'node_modules', 'playwright'));
const argon2 = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'argon2'));

const API_PORT = 4000;
const WEB_PORT = 5173;

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

async function startServers() {
  const apiRunning = await checkPort(API_PORT);
  if (!apiRunning) {
    console.log('[STARTUP] Starting carrental-api on port 4000...');
    apiProcess = spawn('node', ['src/server.js'], {
      cwd: path.join(__dirname, '..', 'carrental-api'),
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, PAYMENT_GATEWAY: 'mock', NODE_ENV: 'development', DB_NAME: 'carrental_test' },
    });
    apiProcess.stderr.on('data', (d) => console.error('[API ERR]:', d.toString()));
    const ok = await waitForPort(API_PORT);
    if (!ok) throw new Error('API failed to start');
    console.log('API is ready');
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
    if (!ok) throw new Error('Web failed to start');
    console.log('Web is ready');
  }
}

async function captureAfter() {
  await startServers();

  const parityDir = path.join(__dirname, '..', 'parity');
  if (!fs.existsSync(parityDir)) fs.mkdirSync(parityDir, { recursive: true });

  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'carrental_test',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const testEmail = 'cust_pay_a@example.com';
  const hashedPw = await argon2.hash('Password123!');
  await pool.query(
    `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash)
     VALUES (?, ?, ?, '', ?)
     ON DUPLICATE KEY UPDATE FullName = VALUES(FullName), Password = '', password_hash = VALUES(password_hash)`,
    ['Customer Pay A', testEmail, '9876543211', hashedPw]
  );

  const [bRes] = await pool.query('INSERT INTO tblbrands (BrandName) VALUES (?)', [`Brand_${Date.now()}`]);
  const [vRes] = await pool.query(`
    INSERT INTO tblvehicles (VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType, ModelYear, SeatingCapacity, vehicle_status, Status)
    VALUES ('PaySedan', ?, 'Sedan', 1200, 'Petrol', 2025, 5, 'Available', 1)
  `, [bRes.insertId]);

  const [bkg] = await pool.query(`
    INSERT INTO tblbooking (userEmail, VehicleId, FromDate, ToDate, message, Status)
    VALUES (?, ?, '2026-11-20', '2026-11-22', 'Test', 1)
  `, [testEmail, vRes.insertId]);

  await pool.query('DELETE FROM tblpayments WHERE booking_id = ?', [bkg.insertId]);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Logging in on desktop...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.locator('.login_btn a[href="#loginform"]').click();
  await page.locator('#loginform input[name="email"]').fill(testEmail);
  await page.locator('#loginform input[name="password"]').fill('Password123!');
  await page.locator('#loginform input[type="submit"]').click();
  await page.waitForSelector('text=Welcome To Car rental portal', { timeout: 10000 });
  console.log('Logged in successfully.');

  const widths = [360, 375, 414, 768];

  for (const w of widths) {
    console.log(`Setting viewport to ${w}x800...`);
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });
    
    // Wait for the booking row
    const bookingRow = page.locator(`li[data-booking-id="${bkg.insertId}"]`);
    await bookingRow.waitFor({ state: 'visible', timeout: 10000 });

    const payBtn = bookingRow.locator('button:has-text("Pay now")');
    await payBtn.scrollIntoViewIfNeeded();
    await payBtn.click();

    await page.waitForSelector('.payment-modal-dialog', { timeout: 5000 });
    await page.waitForTimeout(600);

    const initialFile = path.join(parityDir, `payment-modal-after-${w}px.png`);
    await page.screenshot({ path: initialFile, fullPage: false });
    console.log(`Saved: ${initialFile}`);

    // Click "Pay securely" to open mock checkout
    const paySecurelyBtn = page.locator('.payment-modal-dialog button:has-text("Pay securely")');
    if (await paySecurelyBtn.isVisible()) {
      await paySecurelyBtn.click();
      await page.waitForSelector('button:has-text("Simulate success")', { timeout: 5000 });
      await page.waitForTimeout(600);

      const mockFile = path.join(parityDir, `payment-mock-after-${w}px.png`);
      await page.screenshot({ path: mockFile, fullPage: false });
      console.log(`Saved: ${mockFile}`);
    }

    // Close modal
    const closeBtn = page.locator('.payment-modal-dialog button.close');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(300);
    }
  }

  await browser.close();
  await pool.end();
  console.log('Done capturing all after screenshots.');
  process.exit(0);
}

captureAfter().catch((err) => {
  console.error(err);
  process.exit(1);
});
