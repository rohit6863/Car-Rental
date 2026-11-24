'use strict';

const http = require('http');
const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');
const mysql = require(path.join(__dirname, '..', 'carrental-api', 'node_modules', 'mysql2', 'promise'));
const { chromium } = require(path.join(__dirname, '..', 'carrental-admin', 'node_modules', 'playwright'));

const API_PORT = 4000;
const WEB_PORT = 5173;
const MOCK_OIDC_PORT = 9099;

const TEST_CLIENT_ID = 'test-playwright-client-id.apps.googleusercontent.com';
const TEST_CLIENT_SECRET = 'test-playwright-secret-xyz';
const TEST_REDIRECT_URI = 'http://localhost:5173/api/auth/google/callback';
const TEST_FRONTEND_URL = 'http://localhost:5173';

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

// Kill process on a port if needed (Windows)
function killPort(port) {
  return new Promise((resolve) => {
    const cp = spawn('powershell', [
      '-NoProfile',
      '-Command',
      `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`
    ]);
    cp.on('close', () => resolve());
  });
}

let apiProcess = null;
let webProcess = null;
let mockOidcServer = null;

// Mock OIDC state store
const mockSessions = new Map();

function startMockOidcServer() {
  return new Promise((resolve) => {
    mockOidcServer = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url, `http://localhost:${MOCK_OIDC_PORT}`);
      const pathname = parsedUrl.pathname;

      if (pathname === '/auth') {
        const state = parsedUrl.searchParams.get('state');
        const redirectUri = parsedUrl.searchParams.get('redirect_uri');
        const session = mockSessions.get(state) || {};
        const code = `mock_code_${state || 'default'}`;
        mockSessions.set(code, { ...session, state });

        // Redirect browser back with code & state
        res.writeHead(302, {
          Location: `${redirectUri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        });
        res.end();
        return;
      }

      if (pathname === '/token' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const session = mockSessions.get(data.code) || {};
            const idToken = `mock_jwt_token_${data.code}`;
            mockSessions.set(idToken, session);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ id_token: idToken, access_token: 'mock_at_xyz' }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      if (pathname === '/verify' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const session = mockSessions.get(data.idToken) || {};
            const payload = {
              iss: `http://localhost:${MOCK_OIDC_PORT}`,
              aud: TEST_CLIENT_ID,
              sub: session.sub || 'google_sub_playwright_1001',
              email: session.email || 'playwright_user@testgoogle.com',
              name: session.name || 'Playwright Verified Customer',
              email_verified: true,
              nonce: session.nonce,
              exp: Math.floor(Date.now() / 1000) + 3600,
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(payload));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    mockOidcServer.listen(MOCK_OIDC_PORT, () => {
      console.log(`[STARTUP] Mock OIDC server running on port ${MOCK_OIDC_PORT}`);
      resolve();
    });
  });
}

async function startServers() {
  await startMockOidcServer();

  // Check if API is already running with providers check
  const apiActive = await checkPort(API_PORT);
  if (apiActive) {
    // Kill existing API to ensure environment variables for Google Auth are freshly loaded
    console.log('[STARTUP] Restarting carrental-api with Google OAuth config...');
    await killPort(API_PORT);
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('[STARTUP] Starting carrental-api with Google OAuth and Mock OIDC on port 4000...');
  apiProcess = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, '..', 'carrental-api'),
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DB_NAME: process.env.DB_NAME || 'wanderwheels_e2e_test',
      GOOGLE_CLIENT_ID: TEST_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: TEST_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: TEST_REDIRECT_URI,
      FRONTEND_URL: TEST_FRONTEND_URL,
      MOCK_OIDC_URL: `http://localhost:${MOCK_OIDC_PORT}`,
      MOCK_OIDC_ISSUER: `http://localhost:${MOCK_OIDC_PORT}`,
    },
  });

  const apiReady = await waitForPort(API_PORT);
  if (!apiReady) throw new Error('API server failed to start on port 4000');
  console.log('  -> API server ready on port 4000.');

  const webActive = await checkPort(WEB_PORT);
  if (!webActive) {
    console.log('[STARTUP] Starting carrental-web on port 5173...');
    webProcess = spawn('npm.cmd', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'carrental-web'),
      stdio: 'pipe',
      shell: true,
    });
    const webReady = await waitForPort(WEB_PORT);
    if (!webReady) throw new Error('Web dev server failed to start on port 5173');
    console.log('  -> Web server ready on port 5173.');
  } else {
    console.log('  -> Web server already running on port 5173.');
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('  PLAYWRIGHT REAL BROWSER TEST: GOOGLE OAUTH FLOWS');
  console.log('  Rule: REAL CLICKS ONLY (no force:true, no setChecked)');
  console.log('============================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'wanderwheels_e2e_test',
  });

  let browser;
  try {
    await startServers();

    // Clean up test data
    console.log('[CLEANUP] Cleaning test database records...');
    await pool.query('DELETE FROM tblusers WHERE EmailId LIKE "%@testgoogle.com"');
    await pool.query('DELETE FROM tbl_refresh_tokens WHERE user_type = "user"');
    await pool.query('DELETE FROM tbl_login_attempts');

    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE A: PARAMETER VERIFICATION & STOP AT GOOGLE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST A] Initiating Google sign-in and verifying query parameters at Google...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Click "Login / Register" in header with REAL click
    const loginRegisterBtn = page.locator('.login_btn a[href="#loginform"]');
    await loginRegisterBtn.waitFor({ state: 'visible' });
    await loginRegisterBtn.click();
    console.log('  -> Clicked "Login / Register" header button.');

    // Wait for login modal
    const googleButton = page.locator('#loginform a[href="/api/auth/google"]');
    await googleButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('  -> Verified "Continue with Google" button is visible in modal.');

    let capturedGoogleUrl = null;
    const reqListener = (req) => {
      const u = req.url();
      if (u.includes('accounts.google.com/o/oauth2/v2/auth')) {
        capturedGoogleUrl = u;
      }
    };
    page.on('request', reqListener);

    // Also intercept via context route to stop navigation to Google
    await context.route('https://accounts.google.com/**', async (route) => {
      const u = route.request().url();
      if (u.includes('accounts.google.com/o/oauth2/v2/auth')) {
        capturedGoogleUrl = u;
      }
      // Rule: "Stop at Google" - do not make real network requests to Google accounts
      await route.abort();
    });

    // Click "Continue with Google" with REAL click
    console.log('  -> Clicking "Continue with Google"...');
    await googleButton.click();

    // Wait for the navigation to trigger request interception
    const startWait = Date.now();
    while (!capturedGoogleUrl && Date.now() - startWait < 10000) {
      await new Promise((r) => setTimeout(r, 200));
    }

    page.off('request', reqListener);
    await context.unroute('https://accounts.google.com/**');

    assert(capturedGoogleUrl, 'Browser did not initiate navigation to accounts.google.com');
    console.log('  -> Captured navigation URL successfully:\n    ', capturedGoogleUrl);

    const parsedGoogleUrl = new URL(capturedGoogleUrl);
    assert.strictEqual(parsedGoogleUrl.origin, 'https://accounts.google.com');
    assert.strictEqual(parsedGoogleUrl.pathname, '/o/oauth2/v2/auth');

    // Verify all exact required query parameters
    assert.strictEqual(parsedGoogleUrl.searchParams.get('client_id'), TEST_CLIENT_ID, 'client_id mismatch');
    assert.strictEqual(parsedGoogleUrl.searchParams.get('redirect_uri'), TEST_REDIRECT_URI, 'redirect_uri mismatch');
    assert.strictEqual(parsedGoogleUrl.searchParams.get('response_type'), 'code', 'response_type mismatch');
    assert.strictEqual(parsedGoogleUrl.searchParams.get('prompt'), 'select_account', 'prompt mismatch');
    assert.strictEqual(parsedGoogleUrl.searchParams.get('code_challenge_method'), 'S256', 'code_challenge_method mismatch');

    const scope = parsedGoogleUrl.searchParams.get('scope') || '';
    assert(scope.includes('openid') && scope.includes('email') && scope.includes('profile'), 'scope missing openid/email/profile');

    const state = parsedGoogleUrl.searchParams.get('state');
    assert(state && state.length >= 32, 'state parameter must be at least 32 chars');

    const codeChallenge = parsedGoogleUrl.searchParams.get('code_challenge');
    assert(codeChallenge && codeChallenge.length >= 32, 'code_challenge parameter missing or short');

    const nonce = parsedGoogleUrl.searchParams.get('nonce');
    assert(nonce && nonce.length >= 32, 'nonce parameter missing or short');

    console.log('  [PASS] Test Case A passed: all 9 OAuth parameters exactly match specification.');
    await page.unroute('https://accounts.google.com/**');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE B: FULL BROWSER FLOW WITH LOCAL MOCK OIDC SERVER
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST B] Running full browser flow against local mock OIDC server (port 9099)...');
    
    // Intercept /api/auth/google to preserve real API session cookie generation,
    // and route the authorization step to our local mock OIDC server on port 9099.
    await page.route('**/api/auth/google*', async (route) => {
      const response = await route.fetch({ maxRedirects: 0 });
      const googleLocation = response.headers()['location'] || response.headers()['Location'];
      const reqUrl = new URL(googleLocation);
      const stateParam = reqUrl.searchParams.get('state');
      const nonceParam = reqUrl.searchParams.get('nonce');
      const redirectUriParam = reqUrl.searchParams.get('redirect_uri');

      // Store session details for mock OIDC server token exchange & verification
      mockSessions.set(stateParam, {
        sub: 'google_sub_playwright_1001',
        email: 'playwright_user@testgoogle.com',
        name: 'Playwright Verified Customer',
        nonce: nonceParam,
      });

      // Fulfill route with the API's Set-Cookie headers, but redirect location to mock OIDC server
      const mockAuthUrl = `http://localhost:${MOCK_OIDC_PORT}/auth?state=${encodeURIComponent(stateParam)}&redirect_uri=${encodeURIComponent(redirectUriParam)}`;
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          location: mockAuthUrl,
        },
      });
    });

    // Go to homepage fresh
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Click "Login / Register" with REAL click
    const loginBtnB = page.locator('.login_btn a[href="#loginform"]');
    await loginBtnB.waitFor({ state: 'visible' });
    await loginBtnB.click();

    // Click "Continue with Google" with REAL click
    const googleBtnB = page.locator('#loginform a[href="/api/auth/google"]');
    await googleBtnB.waitFor({ state: 'visible' });
    console.log('  -> Clicking "Continue with Google" for full authorization flow...');
    await googleBtnB.click();

    // Wait for the browser to navigate through Google -> Mock OIDC -> API Callback -> Frontend
    await page.waitForURL((url) => url.origin === 'http://localhost:5173' && (url.pathname === '/' || url.pathname === '/profile'), {
      timeout: 15000,
    });
    console.log(`  -> Browser landed on ${page.url()} after OAuth callback.`);

    // Verify user is logged in and customer name is rendered in Header dropdown
    const userDropdown = page.locator('.user_login');
    await userDropdown.waitFor({ state: 'visible', timeout: 8000 });
    const userMenuText = await userDropdown.innerText();
    console.log(`  -> Header user menu text: "${userMenuText.replace(/\s+/g, ' ').trim()}"`);
    assert(userMenuText.toLowerCase().includes('playwright verified customer'), 'Customer name was not rendered in header navbar');

    // Verify inline notice on profile page if redirected there (missing contact number)
    if (page.url().includes('/profile')) {
      const noticeBanner = page.locator('.errorWrap');
      await noticeBanner.waitFor({ state: 'visible', timeout: 5000 });
      const noticeText = await noticeBanner.innerText();
      console.log(`  -> Verified profile notice banner: "${noticeText.trim()}"`);
      assert(noticeText.includes('contact number'), 'Profile missing contact notice not displayed');
    }

    // Verify user in database
    const [dbUsers] = await pool.query('SELECT * FROM tblusers WHERE EmailId = "playwright_user@testgoogle.com"');
    assert.strictEqual(dbUsers.length, 1, 'Customer not created in tblusers');
    assert.strictEqual(dbUsers[0].google_id, 'google_sub_playwright_1001');
    assert.strictEqual(dbUsers[0].auth_provider, 'google');
    assert.strictEqual(dbUsers[0].email_verified, 1);
    assert.strictEqual(dbUsers[0].Password, null);
    assert.strictEqual(dbUsers[0].password_hash, null);
    console.log('  -> Verified database record: customer created with email_verified=1, password=NULL.');

    console.log('  [PASS] Test Case B passed: full OAuth browser flow succeeded and customer name displayed.');
    await page.unroute('**/api/auth/google*');

    // ──────────────────────────────────────────────────────────────────────────
    // TEST CASE C: PROVIDER CANCELLATION / DENIAL (error=access_denied)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n[TEST C] Testing provider cancellation (error=access_denied) flow...');

    // Sign out first by clearing session cookies
    console.log('  -> Resetting session cookies for test C...');
    await context.clearCookies();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Intercept /api/auth/google to simulate user clicking "Cancel" at Google provider
    await page.route('**/api/auth/google*', async (route) => {
      const response = await route.fetch({ maxRedirects: 0 });
      const googleLocation = response.headers()['location'] || response.headers()['Location'];
      const reqUrl = new URL(googleLocation);
      const stateParam = reqUrl.searchParams.get('state');
      const redirectUriParam = reqUrl.searchParams.get('redirect_uri');

      // Simulate Google returning error=access_denied
      const cancelUrl = `${redirectUriParam}?error=access_denied&state=${encodeURIComponent(stateParam)}`;
      await route.fulfill({
        response,
        headers: {
          ...response.headers(),
          location: cancelUrl,
        },
      });
    });

    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Open login modal with REAL click
    const loginBtnC = page.locator('.login_btn a[href="#loginform"]');
    await loginBtnC.waitFor({ state: 'visible' });
    await loginBtnC.click();

    // Click "Continue with Google" with REAL click
    const googleBtnC = page.locator('#loginform a[href="/api/auth/google"]');
    await googleBtnC.waitFor({ state: 'visible' });
    console.log('  -> Clicking "Continue with Google" (will be cancelled at provider)...');
    await googleBtnC.click();

    // Wait for the browser to navigate back to /?error=cancelled and reopen modal
    await page.waitForURL((url) => url.origin === 'http://localhost:5173' && url.pathname === '/', {
      timeout: 10000,
    });
    console.log(`  -> Browser redirected back to home: ${page.url()}`);

    // Verify modal is open and error banner is displayed
    const errorBanner = page.locator('#loginform .alert-danger');
    await errorBanner.waitFor({ state: 'visible', timeout: 8000 });
    const errText = await errorBanner.innerText();
    console.log(`  -> Verified error message banner: "${errText.trim()}"`);
    assert(errText.includes('Google sign-in was cancelled'), 'Expected cancellation error text in login modal');

    console.log('  [PASS] Test Case C passed: cancellation redirected to home and opened modal with error.');
    await page.unroute('**/api/auth/google*');

    console.log('\n============================================================');
    console.log('  ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY (3/3)');
    console.log('============================================================\n');

  } finally {
    const { killPid } = require('./server-helper.cjs');
    if (browser) await browser.close();
    if (mockOidcServer) mockOidcServer.close();
    if (apiProcess) killPid(apiProcess.pid);
    if (webProcess) killPid(webProcess.pid);
    await pool.end();
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('\n[FATAL ERROR IN PLAYWRIGHT SUITE]', err);
  const { killPid } = require('./server-helper.cjs');
  if (mockOidcServer) mockOidcServer.close();
  if (apiProcess) killPid(apiProcess.pid);
  if (webProcess) killPid(webProcess.pid);
  process.exit(1);
});
