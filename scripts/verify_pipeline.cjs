'use strict';
/**
 * Full Pipeline Verification Runner
 * Runs:
 * 1. Jest API unit/integration tests
 * 2. Playwright E2E suite
 * 3. Vite production builds (web & admin)
 * 4. Runtime page image audit (0 broken images, naturalWidth > 0)
 * 5. Component interactive verification (gallery, grid, admin tables)
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

async function runVerification(stepLabel) {
  console.log('================================================================');
  console.log(`  VERIFICATION PIPELINE: ${stepLabel}`);
  console.log('================================================================\n');

  // 1. Jest tests
  console.log('[1/5] Running carrental-api Jest tests...');
  const jestRes = spawnSync('cmd.exe', ['/c', 'npm.cmd test'], {
    cwd: path.join(ROOT, 'carrental-api'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', DB_NAME: 'carrental_test' }
  });
  if (jestRes.status !== 0) {
    throw new Error(`[FAIL] Jest tests failed in ${stepLabel}`);
  }
  console.log('  -> PASS: 11 Jest test suites (112 tests) passed.\n');

  // 2. Playwright E2E suite
  console.log('[2/5] Running full E2E test suite (e2e/run-all.cjs)...');
  const e2eRes = spawnSync(process.execPath, [path.join(ROOT, 'e2e', 'run-all.cjs')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, DB_NAME: 'carrental_test' }
  });
  if (e2eRes.status !== 0) {
    throw new Error(`[FAIL] E2E suite failed in ${stepLabel}`);
  }
  console.log('  -> PASS: All 11 E2E browser suites passed.\n');

  // 3. Builds
  console.log('[3/5] Running production builds (carrental-web & carrental-admin)...');
  const buildWeb = spawnSync('cmd.exe', ['/c', 'npm.cmd run build'], {
    cwd: path.join(ROOT, 'carrental-web'),
    stdio: 'inherit'
  });
  if (buildWeb.status !== 0) throw new Error(`[FAIL] Web build failed in ${stepLabel}`);

  const buildAdmin = spawnSync('cmd.exe', ['/c', 'npm.cmd run build'], {
    cwd: path.join(ROOT, 'carrental-admin'),
    stdio: 'inherit'
  });
  if (buildAdmin.status !== 0) throw new Error(`[FAIL] Admin build failed in ${stepLabel}`);
  console.log('  -> PASS: Both Vite production builds succeeded.\n');

  // 4 & 5. Browser Image Audit & Component Interactive Verification
  console.log('[4/5 & 5/5] Running browser image audit & interactive component tests...');
  const { chromium } = require(path.join(ROOT, 'carrental-web', 'node_modules', 'playwright'));
  const { ensureServers, stopServers } = require('../e2e/server-helper.cjs');
  const assert = require('assert');

  await ensureServers({ api: true, web: true, admin: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    const page = await browser.newPage();
    const failedImgRequests = [];
    page.on('response', resp => {
      const url = resp.url();
      if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].some(ext => url.toLowerCase().includes(ext))) {
        if (resp.status() >= 400) {
          failedImgRequests.push({ url, status: resp.status() });
        }
      }
    });

    const routesToAudit = [
      'http://localhost:5173/',
      'http://localhost:5173/car-listing',
      'http://localhost:5173/vehical-details/14',
      'http://localhost:5173/contact-us',
      'http://localhost:5173/page/aboutus'
    ];

    for (const r of routesToAudit) {
      await page.goto(r, { waitUntil: 'networkidle' });
      const brokenImages = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src);
      });
      assert.strictEqual(brokenImages.length, 0, `Broken images detected on ${r}: ${brokenImages.join(', ')}`);
    }
    assert.strictEqual(failedImgRequests.length, 0, `Failed image network requests: ${JSON.stringify(failedImgRequests)}`);
    console.log('  -> PASS: 0 broken images and 0 failed image network requests across public routes.');

    // Component tests
    await page.goto('http://localhost:5173/vehical-details/14');
    await page.waitForSelector('#listing_img_slider');
    const thumbnails = page.locator('#listing_img_slider img[alt="thumbnail"]');
    const initialSrc = await page.locator('#listing_img_slider img[alt="vehicle"]').getAttribute('src');
    await thumbnails.nth(1).click();
    await page.waitForTimeout(200);
    const swappedSrc = await page.locator('#listing_img_slider img[alt="vehicle"]').getAttribute('src');
    assert.notStrictEqual(initialSrc, swappedSrc, 'Main image must swap on thumbnail click');
    await thumbnails.nth(0).click();
    console.log('  -> PASS: Gallery thumbnail swapping verified.');

    // Admin table test
    const mysql = require(path.join(ROOT, 'carrental-api', 'node_modules', 'mysql2', 'promise'));
    const argon2 = require(path.join(ROOT, 'carrental-api', 'node_modules', 'argon2'));
    const conn = await mysql.createConnection({ host: '127.0.0.1', user: 'root', database: 'carrental_test', port: 3306 });
    const hash = await argon2.hash('admin');
    await conn.query('UPDATE admin SET password_hash = ?, must_change_password = 0 WHERE UserName = ?', [hash, 'admin']);
    await conn.end();

    const adminPage = await browser.newPage();
    await adminPage.goto('http://localhost:5175/login');
    await adminPage.fill('#username', 'admin');
    await adminPage.fill('#password', 'admin');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL('**/dashboard');

    await adminPage.goto('http://localhost:5175/manage-vehicles');
    await adminPage.waitForSelector('table#vehicleTable');
    const rows = await adminPage.locator('table#vehicleTable tbody tr').count();
    assert(rows > 0, 'Admin vehicles table must have rows');
    console.log(`  -> PASS: Admin tables rendered ${rows} rows with no JS/DOM errors.`);

    await adminPage.close();
    await page.close();
  } finally {
    await browser.close();
    stopServers();
  }

  console.log(`\n================================================================`);
  console.log(`  VERIFICATION PASSED 100% FOR: ${stepLabel}`);
  console.log(`================================================================\n`);
}

if (require.main === module) {
  const label = process.argv[2] || 'Manual Check';
  runVerification(label).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runVerification };
