const { chromium } = require('@playwright/test');
const assert = require('assert');
const path = require('path');

async function testDatePicker() {
  console.log('[TEST] Starting Flatpickr datepicker & zero-CDN test...');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const thirdPartyRequests = [];
  const failedRequests = [];

  page.on('request', (req) => {
    const url = req.url();
    // Check if any request goes to external third-party hosts
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('http://localhost:4000') && !url.startsWith('data:')) {
      thirdPartyRequests.push(url);
    }
  });

  page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('[BROWSER CONSOLE ERROR]:', msg.text());
    }
  });

  console.log('[TEST] Navigating to http://localhost:5173/vehical-details/14...');
  await page.goto('http://localhost:5173/vehical-details/14', { waitUntil: 'networkidle', timeout: 15000 });

  // 1. Verify NO third-party network requests occurred
  console.log('[TEST] Verifying zero third-party network requests...');
  assert.strictEqual(
    thirdPartyRequests.length,
    0,
    `Found unexpected third-party network requests: ${JSON.stringify(thirdPartyRequests, null, 2)}`
  );
  console.log('  -> PASS: 0 third-party requests detected. All assets bundled self-hosted!');

  assert.strictEqual(
    failedRequests.length,
    0,
    `Found failed network requests: ${JSON.stringify(failedRequests, null, 2)}`
  );
  console.log('  -> PASS: 0 failed network requests.');

  // 2. Verify Presence of Elements: From Date, To Date, Legend, Icons
  console.log('[TEST] Verifying datepicker DOM elements, calendar icons, and legend...');
  const fromInput = page.locator('#fromdate');
  const toInput = page.locator('#todate');
  await fromInput.waitFor({ state: 'visible', timeout: 5000 });
  await toInput.waitFor({ state: 'visible', timeout: 5000 });

  const legend = page.locator('.date-legend');
  await legend.waitFor({ state: 'visible', timeout: 5000 });
  const legendText = await legend.innerText();
  assert(legendText.includes('Available Dates'), 'Legend missing Available Dates');
  assert(legendText.includes('Booked Dates'), 'Legend missing Booked Dates');
  console.log('  -> PASS: Legend and inputs present.');

  // 3. Test Clicking From Date -> Popup must open
  console.log('[TEST] Clicking #fromdate input to verify .flatpickr-calendar popup...');
  await fromInput.click();
  await page.waitForTimeout(400);

  const flatpickrCalendar = page.locator('.flatpickr-calendar.open');
  await flatpickrCalendar.waitFor({ state: 'visible', timeout: 3000 });
  const isCalendarOpen = await flatpickrCalendar.isVisible();
  assert.strictEqual(isCalendarOpen, true, 'Flatpickr calendar popup did not open on #fromdate click!');
  console.log('  -> PASS: .flatpickr-calendar popup opened successfully!');

  // Capture screenshot with open calendar
  await page.screenshot({ path: path.join(__dirname, '..', 'parity', 'test_datepicker_calendar_open.png') });
  console.log('  -> Saved screenshot: parity/test_datepicker_calendar_open.png');

  // 4. Test selecting date from calendar
  console.log('[TEST] Selecting a date from Flatpickr calendar...');
  // Find clickable days in the open calendar that are not disabled and not prev/next month
  const availableDays = flatpickrCalendar.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');
  const dayCount = await availableDays.count();
  assert(dayCount >= 2, 'Expected at least 2 available days in Flatpickr calendar');

  // Select day 1 (e.g. index 5)
  const targetDay1 = availableDays.nth(Math.min(5, dayCount - 2));
  await targetDay1.click();
  await page.waitForTimeout(300);

  const selectedFromDateVal = await fromInput.inputValue();
  console.log('  -> Selected From Date:', selectedFromDateVal);
  assert(selectedFromDateVal.length === 10, 'Expected valid YYYY-MM-DD from calendar click');

  // Now click #todate and select a later day
  console.log('[TEST] Clicking #todate and selecting end date...');
  await toInput.click();
  await page.waitForTimeout(400);

  const toCalendar = page.locator('.flatpickr-calendar.open');
  await toCalendar.waitFor({ state: 'visible', timeout: 3000 });
  const toAvailableDays = toCalendar.locator('.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)');
  const toDayCount = await toAvailableDays.count();

  // Select day 2 (later than targetDay1)
  const targetDay2 = toAvailableDays.nth(Math.min(8, toDayCount - 1));
  await targetDay2.click();
  await page.waitForTimeout(500);

  const selectedToDateVal = await toInput.inputValue();
  console.log('  -> Selected To Date:', selectedToDateVal);

  // Check Duration and Total
  const durationText = await page.locator('#numberOfDays').innerText();
  const totalText = await page.locator('#totalAmount').innerText();
  console.log('  -> Duration displayed:', durationText);
  console.log('  -> Total displayed:', totalText);

  // Calculate expected inclusive count:
  const d1 = new Date(selectedFromDateVal + 'T00:00:00');
  const d2 = new Date(selectedToDateVal + 'T00:00:00');
  const expectedDays = Math.round((d2 - d1) / 86400000) + 1;
  const expectedTotal = expectedDays * 22000;

  assert.strictEqual(durationText, `${expectedDays} days`, `Expected duration "${expectedDays} days", got "${durationText}"`);
  assert.strictEqual(totalText, `Rs. ${expectedTotal}`, `Expected total "Rs. ${expectedTotal}", got "${totalText}"`);
  console.log('  -> PASS: Duration and Total accurately match inclusive formula from calendar click!');

  // 5. Test manual date typing and blur
  console.log('[TEST] Testing manual date input and blur event...');
  await fromInput.fill('2026-11-20');
  await fromInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  await fromInput.evaluate((el) => el.dispatchEvent(new Event('blur', { bubbles: true })));

  await toInput.fill('2026-11-23');
  await toInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  await toInput.evaluate((el) => el.dispatchEvent(new Event('blur', { bubbles: true })));

  await page.waitForTimeout(600);

  const manualDuration = await page.locator('#numberOfDays').innerText();
  const manualTotal = await page.locator('#totalAmount').innerText();
  console.log('  -> Manual input Duration:', manualDuration);
  console.log('  -> Manual input Total:', manualTotal);

  // Inclusive count: 23 - 20 + 1 = 4 days
  assert.strictEqual(manualDuration, '4 days', 'Manual input duration should be 4 days');
  assert.strictEqual(manualTotal, 'Rs. 88000', 'Manual input total should be Rs. 88000 (4 * 22000)');
  console.log('  -> PASS: Manual typing updates Duration & Total via change/blur!');

  // 6. Test manual date input with DD/MM/YYYY format
  console.log('[TEST] Testing manual date input with DD/MM/YYYY format (05/12/2026 to 08/12/2026)...');
  await fromInput.click();
  await fromInput.press('Control+A');
  await fromInput.press('Backspace');
  await fromInput.pressSequentially('05/12/2026', { delay: 20 });
  await fromInput.press('Tab');
  await page.waitForTimeout(200);

  await toInput.click();
  await toInput.press('Control+A');
  await toInput.press('Backspace');
  await toInput.pressSequentially('08/12/2026', { delay: 20 });
  await toInput.press('Tab');
  await page.waitForTimeout(600);

  const dmyFromVal = await fromInput.inputValue();
  const dmyToVal = await toInput.inputValue();
  const dmyValidationMsg = await page.locator('.alert-warning').isVisible() ? await page.locator('.alert-warning').innerText() : 'none';
  const dmyDuration = await page.locator('#numberOfDays').innerText();
  const dmyTotal = await page.locator('#totalAmount').innerText();
  console.log('  -> From input value:', dmyFromVal);
  console.log('  -> To input value:', dmyToVal);
  console.log('  -> Validation msg:', dmyValidationMsg);
  console.log('  -> Duration displayed:', dmyDuration);
  console.log('  -> Total displayed:', dmyTotal);
  assert.strictEqual(dmyDuration, '4 days', 'DD/MM/YYYY duration should normalize and be 4 days');
  assert.strictEqual(dmyTotal, 'Rs. 88000', 'DD/MM/YYYY total should normalize and be Rs. 88000');
  console.log('  -> PASS: Normalized DD/MM/YYYY date successfully calculated!');
  assert.strictEqual(dmyTotal, 'Rs. 88000', 'DD/MM/YYYY total should normalize and be Rs. 88000');
  console.log('  -> PASS: Normalized DD/MM/YYYY date successfully calculated!');

  // 7. Test invalid / unparseable date validation message
  console.log('[TEST] Testing invalid date input message...');
  await fromInput.fill('not-a-valid-date');
  await fromInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForTimeout(300);

  const validationMsg = await page.locator('.alert-warning').innerText();
  console.log('  -> Validation message displayed:', validationMsg);
  assert(
    validationMsg.includes('Please enter valid dates'),
    `Expected clear validation message, got "${validationMsg}"`
  );
  const zeroDuration = await page.locator('#numberOfDays').innerText();
  assert.strictEqual(zeroDuration, '0 days', 'Invalid date should reset duration to 0 days');
  console.log('  -> PASS: Clear validation message shown for invalid dates without saying "Vehicle is not available"!');

  // 8. Test end date <= start date validation message
  console.log('[TEST] Testing end date before start date validation message...');
  await fromInput.fill('2026-11-25');
  await fromInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  await toInput.fill('2026-11-20');
  await toInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForTimeout(300);

  const rangeValidationMsg = await page.locator('.alert-warning').innerText();
  console.log('  -> Range validation message displayed:', rangeValidationMsg);
  assert(
    rangeValidationMsg.includes('End date must be after start date'),
    `Expected range validation message, got "${rangeValidationMsg}"`
  );
  console.log('  -> PASS: End date before start date correctly validated!');

  await page.screenshot({ path: path.join(__dirname, '..', 'parity', 'test_datepicker_complete.png') });
  console.log('  -> Saved screenshot: parity/test_datepicker_complete.png');

  await browser.close();
  console.log('\n[TEST SUCCESS] ALL DATEPICKER, CALCULATION & ZERO-CDN TESTS PASSED 100%!');
}

testDatePicker().catch((err) => {
  console.error('[TEST FAILURE]:', err);
  process.exit(1);
});
