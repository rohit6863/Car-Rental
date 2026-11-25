'use strict';

const path = require('path');
const assert = require('assert');
const { chromium } = require(path.join(__dirname, '..', 'carrental-web', 'node_modules', 'playwright'));
const { ensureServers, stopServers } = require('./server-helper.cjs');

async function assertSingleOpenDialog(page, expectedTestId) {
  const dialogs = page.locator('[role="dialog"]');
  const count = await dialogs.count();
  assert.strictEqual(count, 1, `Expected strictly 1 open [role="dialog"], found ${count}`);

  const target = page.locator(`[data-testid="${expectedTestId}"]`);
  await target.waitFor({ state: 'visible', timeout: 5000 });

  const ariaModal = await target.getAttribute('aria-modal');
  assert.strictEqual(ariaModal, 'true', `${expectedTestId} must have aria-modal="true"`);

  const backdropCount = await page.locator('.modal-backdrop').count();
  assert.strictEqual(backdropCount, 0, 'Must have 0 legacy .modal-backdrop elements');

  const scrollLocked = await page.evaluate(() => {
    return document.body.style.overflow === 'hidden' && document.body.classList.contains('modal-open');
  });
  assert.strictEqual(scrollLocked, true, 'Body scroll lock must be active while modal is open');
}

async function assertAllDialogsClosed(page) {
  const count = await page.locator('[role="dialog"]').count();
  assert.strictEqual(count, 0, `Expected 0 open [role="dialog"] after close, found ${count}`);

  const backdropCount = await page.locator('.modal-backdrop').count();
  assert.strictEqual(backdropCount, 0, 'Expected 0 .modal-backdrop elements after close');

  const scrollReleased = await page.evaluate(() => {
    return document.body.style.overflow === '' && !document.body.classList.contains('modal-open');
  });
  assert.strictEqual(scrollReleased, true, 'Body scroll lock must be released after close');
}

async function runModalTests() {
  await ensureServers({ api: true, web: true });
  console.log('[TEST] Starting pure React modal & accessibility E2E suite...');

  let browser = null;
  let exitCode = 0;

  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    page.on('pageerror', (err) => {
      throw new Error(`Uncaught pageerror: ${err.message}`);
    });

    // Lookup a valid vehicle ID for VehicleDetailsPage test
    const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || '',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'wanderwheels_e2e_test',
    });
    const [vehicles] = await pool.query('SELECT id FROM tblvehicles ORDER BY id ASC LIMIT 1');
    const targetVehicleId = vehicles[0]?.id || 1;
    await pool.end();

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    await assertAllDialogsClosed(page);

    // 1. Header Login button -> opens Login modal, focus trapped, closes with × and returns focus
    console.log('[STEP 1] Testing Header Login button, focus trap, and close button (×)...');
    const headerLoginBtn = page.locator('[data-testid="header-login-btn"]');
    await headerLoginBtn.click();
    await assertSingleOpenDialog(page, 'login-modal');

    // Verify Tab / Shift+Tab stays inside login-modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const dialog = document.querySelector('[data-testid="login-modal"]');
        return Boolean(dialog && dialog.contains(document.activeElement));
      });
      assert.strictEqual(inside, true, `Tab #${i + 1} escaped login-modal focus trap`);
    }
    await page.keyboard.press('Shift+Tab');
    const insideShift = await page.evaluate(() => {
      const dialog = document.querySelector('[data-testid="login-modal"]');
      return Boolean(dialog && dialog.contains(document.activeElement));
    });
    assert.strictEqual(insideShift, true, 'Shift+Tab escaped login-modal focus trap');

    await page.locator('[data-testid="login-modal-close"]').click();
    await assertAllDialogsClosed(page);

    // Check focus returned to header login button
    await page.waitForTimeout(100);
    const focusedTestId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    assert.strictEqual(focusedTestId, 'header-login-btn', 'Focus must return to header-login-btn on close');

    // 2. Switching Login -> Signup -> Login -> Forgot Password -> Login
    console.log('[STEP 2] Testing modal switching (Login -> Signup -> Login -> Forgot -> Login)...');
    await headerLoginBtn.click();
    await assertSingleOpenDialog(page, 'login-modal');

    await page.locator('[data-testid="switch-to-signup-link"]').click();
    await assertSingleOpenDialog(page, 'signup-modal');

    await page.locator('[data-testid="switch-to-login-from-signup"]').click();
    await assertSingleOpenDialog(page, 'login-modal');

    await page.locator('[data-testid="switch-to-forgot-link"]').click();
    await assertSingleOpenDialog(page, 'forgot-modal');

    await page.locator('[data-testid="switch-to-login-from-forgot"]').click();
    await assertSingleOpenDialog(page, 'login-modal');

    // 3. Close via Escape key
    console.log('[STEP 3] Testing Escape key close...');
    await page.keyboard.press('Escape');
    await assertAllDialogsClosed(page);

    // 4. Close via Backdrop click (e.target === e.currentTarget)
    console.log('[STEP 4] Testing Backdrop click close...');
    await headerLoginBtn.click();
    await assertSingleOpenDialog(page, 'login-modal');
    await page.mouse.click(10, 10);
    await assertAllDialogsClosed(page);

    // 5. Logged-out header account dropdown items
    console.log('[STEP 5] Testing logged-out Account dropdown modal triggers...');
    const dropdownTriggers = [
      'header-dropdown-profile',
      'header-dropdown-password',
      'header-dropdown-booking',
      'header-dropdown-login',
    ];
    for (const testId of dropdownTriggers) {
      await page.locator('[data-testid="header-account-btn"]').click();
      await page.locator(`[data-testid="${testId}"]`).click();
      await assertSingleOpenDialog(page, 'login-modal');
      await page.keyboard.press('Escape');
      await assertAllDialogsClosed(page);
    }

    // 6. Vehicle Details Login For Book trigger
    console.log(`[STEP 6] Testing Vehicle Details login trigger (/vehical-details/${targetVehicleId})...`);
    await page.goto(`http://localhost:5173/vehical-details/${targetVehicleId}`, { waitUntil: 'networkidle', timeout: 15000 });
    const vehicleLoginBtn = page.locator('[data-testid="vehicle-login-btn"]');
    await vehicleLoginBtn.click();
    await assertSingleOpenDialog(page, 'login-modal');
    await page.locator('[data-testid="login-modal-close"]').click();
    await assertAllDialogsClosed(page);

    console.log('[PASS] All pure React modal & accessibility assertions passed!');
  } catch (err) {
    exitCode = 1;
    console.error('[FAIL] Modal E2E suite failed:', err);
  } finally {
    try {
      if (browser) await browser.close();
    } catch (cleanupErr) {
      console.error('[CLEANUP ERROR] Failed to close browser:', cleanupErr);
    }
    try {
      await stopServers();
    } catch (cleanupErr) {
      console.error('[CLEANUP ERROR] Failed to stop servers:', cleanupErr);
    }
  }

  process.exit(exitCode);
}

runModalTests().catch((err) => {
  console.error('[UNHANDLED E2E ERROR]:', err);
  process.exit(1);
});
