const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PARITY_DIR = path.resolve(__dirname, '..', 'parity');
if (!fs.existsSync(PARITY_DIR)) {
  fs.mkdirSync(PARITY_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
];

async function runParity() {
  console.log('[PARITY] Starting visual parity test...');
  console.log('[PARITY] Output directory:', PARITY_DIR);

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const capturePair = async (label, legacyUrl, newUrl, beforeCaptureLegacy, beforeCaptureNew) => {
    for (const vp of VIEWPORTS) {
      console.log(`[PARITY] Capturing ${label} (${vp.name})...`);
      
      // Legacy page
      try {
        const legacyContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const legacyPage = await legacyContext.newPage();
        await legacyPage.goto(legacyUrl, { waitUntil: 'networkidle', timeout: 15000 });
        if (beforeCaptureLegacy) await beforeCaptureLegacy(legacyPage);
        await legacyPage.waitForTimeout(500);
        await legacyPage.screenshot({
          path: path.join(PARITY_DIR, `${label}_legacy_${vp.name}.png`),
          fullPage: true,
        });
        await legacyContext.close();
      } catch (err) {
        console.error(`[PARITY] Error capturing legacy ${label} (${vp.name}):`, err.message);
      }

      // New React page
      try {
        const newContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const newPage = await newContext.newPage();
        await newPage.goto(newUrl, { waitUntil: 'networkidle', timeout: 15000 });
        if (beforeCaptureNew) await beforeCaptureNew(newPage);
        await newPage.waitForTimeout(500);
        await newPage.screenshot({
          path: path.join(PARITY_DIR, `${label}_new_${vp.name}.png`),
          fullPage: true,
        });
        await newContext.close();
      } catch (err) {
        console.error(`[PARITY] Error capturing new ${label} (${vp.name}):`, err.message);
      }
    }
  };

  // 1. Home page
  await capturePair(
    '01_home',
    'http://localhost/carrental/index.php',
    'http://localhost:5173/'
  );

  // 2. Car Listing
  await capturePair(
    '02_car_listing',
    'http://localhost/carrental/car-listing.php',
    'http://localhost:5173/car-listing'
  );

  // 3. Search Results
  await capturePair(
    '03_search_results',
    'http://localhost/carrental/search-carresult.php?brand=2&fueltype=Petrol',
    'http://localhost:5173/search-carresult?brand=2&fueltype=Petrol'
  );

  // 4. Vehicle Details
  await capturePair(
    '04_vehicle_details',
    'http://localhost/carrental/vehical-details.php?vhid=10',
    'http://localhost:5173/vehical-details/9'
  );

  // 5. CMS Page (About Us)
  await capturePair(
    '05_cms_aboutus',
    'http://localhost/carrental/page.php?type=aboutus',
    'http://localhost:5173/page/aboutus'
  );

  // 6. CMS Page (FAQs)
  await capturePair(
    '06_cms_faqs',
    'http://localhost/carrental/page.php?type=faqs',
    'http://localhost:5173/page/faqs'
  );

  // 7. Contact Us
  await capturePair(
    '07_contact_us',
    'http://localhost/carrental/contact-us.php',
    'http://localhost:5173/contact-us'
  );

  // 8. Login Modal
  await capturePair(
    '08_modal_login',
    'http://localhost/carrental/index.php',
    'http://localhost:5173/',
    async (page) => {
      await page.evaluate(() => {
        if (window.$) window.$('#loginform').modal('show');
      });
      await page.waitForTimeout(400);
    },
    async (page) => {
      await page.evaluate(() => {
        if (window.$) window.$('#loginform').modal('show');
      });
      await page.waitForTimeout(400);
    }
  );

  // 9. Signup Modal
  await capturePair(
    '09_modal_signup',
    'http://localhost/carrental/index.php',
    'http://localhost:5173/',
    async (page) => {
      await page.evaluate(() => {
        if (window.$) window.$('#signupform').modal('show');
      });
      await page.waitForTimeout(400);
    },
    async (page) => {
      await page.evaluate(() => {
        if (window.$) window.$('#signupform').modal('show');
      });
      await page.waitForTimeout(400);
    }
  );

  // 10. Forgot Password Modal
  await capturePair(
    '10_modal_forgotpassword',
    'http://localhost/carrental/index.php',
    'http://localhost:5173/',
    async (page) => {
      await page.evaluate(() => {
        if (window.$) window.$('#forgotpassword').modal('show');
      });
      await page.waitForTimeout(400);
    },
    async (page) => {
      await page.evaluate(() => {
        if (window.$) window.$('#forgotpassword').modal('show');
      });
      await page.waitForTimeout(400);
    }
  );

  // Authenticated sessions setup
  // Capture authenticated customer pages: Profile, Update Password, My Booking, Receipt
  for (const vp of VIEWPORTS) {
    console.log(`[PARITY] Capturing Authenticated Pages (${vp.name})...`);

    // Legacy Authenticated session
    try {
      const legacyContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const legacyPage = await legacyContext.newPage();
      await legacyPage.goto('http://localhost/carrental/index.php', { waitUntil: 'networkidle' });
      // Open login modal & submit
      await legacyPage.evaluate(() => {
        if (window.$) window.$('#loginform').modal('show');
      });
      await legacyPage.waitForTimeout(400);
      await legacyPage.fill('#loginform input[name="email"]', 'Test@1234');
      await legacyPage.fill('#loginform input[name="password"]', '1234');
      await legacyPage.click('#loginform input[name="login"]');
      await legacyPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
      await legacyPage.waitForTimeout(1000);

      // 11. Profile
      await legacyPage.goto('http://localhost/carrental/profile.php', { waitUntil: 'networkidle' });
      await legacyPage.screenshot({
        path: path.join(PARITY_DIR, `11_profile_legacy_${vp.name}.png`),
        fullPage: true,
      });

      // 12. Update Password
      await legacyPage.goto('http://localhost/carrental/update-password.php', { waitUntil: 'networkidle' });
      await legacyPage.screenshot({
        path: path.join(PARITY_DIR, `12_update_password_legacy_${vp.name}.png`),
        fullPage: true,
      });

      // 13. My Booking
      await legacyPage.goto('http://localhost/carrental/my-booking.php', { waitUntil: 'networkidle' });
      await legacyPage.screenshot({
        path: path.join(PARITY_DIR, `13_my_booking_legacy_${vp.name}.png`),
        fullPage: true,
      });

      // 14. Receipt
      await legacyPage.goto('http://localhost/carrental/generate-receipt.php?booking_id=12', { waitUntil: 'networkidle' });
      await legacyPage.screenshot({
        path: path.join(PARITY_DIR, `14_receipt_legacy_${vp.name}.png`),
        fullPage: true,
      });

      await legacyContext.close();
    } catch (err) {
      console.error(`[PARITY] Legacy Auth error (${vp.name}):`, err.message);
    }

    // New React Authenticated session
    try {
      const newContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const newPage = await newContext.newPage();
      await newPage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      // Open login modal & submit
      await newPage.evaluate(() => {
        if (window.$) window.$('#loginform').modal('show');
      });
      await newPage.waitForTimeout(400);
      await newPage.fill('#loginform input[name="email"]', 'test@example.com');
      await newPage.fill('#loginform input[name="password"]', 'Password123!');
      await newPage.click('#loginform input[type="submit"]');
      await newPage.waitForTimeout(1500);

      // 11. Profile
      await newPage.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
      await newPage.waitForTimeout(500);
      await newPage.screenshot({
        path: path.join(PARITY_DIR, `11_profile_new_${vp.name}.png`),
        fullPage: true,
      });

      // 12. Update Password
      await newPage.goto('http://localhost:5173/update-password', { waitUntil: 'networkidle' });
      await newPage.waitForTimeout(500);
      await newPage.screenshot({
        path: path.join(PARITY_DIR, `12_update_password_new_${vp.name}.png`),
        fullPage: true,
      });

      // 13. My Booking
      await newPage.goto('http://localhost:5173/my-booking', { waitUntil: 'networkidle' });
      await newPage.waitForTimeout(500);
      await newPage.screenshot({
        path: path.join(PARITY_DIR, `13_my_booking_new_${vp.name}.png`),
        fullPage: true,
      });

      // 14. Receipt
      await newPage.goto('http://localhost:5173/receipt/1', { waitUntil: 'networkidle' });
      await newPage.waitForTimeout(500);
      await newPage.screenshot({
        path: path.join(PARITY_DIR, `14_receipt_new_${vp.name}.png`),
        fullPage: true,
      });

      await newContext.close();
    } catch (err) {
      console.error(`[PARITY] New Auth error (${vp.name}):`, err.message);
    }
  }

  await browser.close();
  console.log('[PARITY] All screenshots captured successfully in:', PARITY_DIR);
}

runParity().catch((err) => {
  console.error('[PARITY] Fatal runner error:', err);
  process.exit(1);
});
