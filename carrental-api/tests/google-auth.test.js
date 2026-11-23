'use strict';
const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const { query } = require('../src/db/pool');
const { generateCsrfToken } = require('../src/middleware/csrf');
const googleAuthService = require('../src/services/googleAuth.service');
const { verifyAccessToken } = require('../src/utils/jwt');

describe('Customer Google OAuth Authentication & Pre-Hijacking Defense', () => {
  const originalEnv = { ...process.env };
  const TEST_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
  const TEST_CLIENT_SECRET = 'test-google-client-secret-xyz';
  const TEST_REDIRECT_URI = 'http://localhost:5173/api/auth/google/callback';
  const TEST_FRONTEND_URL = 'http://localhost:5173';

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = TEST_CLIENT_SECRET;
    process.env.GOOGLE_REDIRECT_URI = TEST_REDIRECT_URI;
    process.env.FRONTEND_URL = TEST_FRONTEND_URL;
  });

  afterAll(async () => {
    googleAuthService.resetClient();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    googleAuthService.resetClient();
    process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = TEST_CLIENT_SECRET;
    process.env.GOOGLE_REDIRECT_URI = TEST_REDIRECT_URI;
    process.env.FRONTEND_URL = TEST_FRONTEND_URL;
  });

  afterEach(async () => {
    // Clean up test users
    await query('DELETE FROM tbl_refresh_tokens WHERE user_type = "user"');
    await query('DELETE FROM tblusers WHERE EmailId LIKE "%@testgoogle.com" OR EmailId = "admin@example.com"');
  });

  describe('1. Provider Discovery & Configuration Rules', () => {
    test('GET /api/auth/providers returns { google: true } when configured', async () => {
      const res = await request(app).get('/api/auth/providers');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ google: true });
    });

    test('GET /api/auth/providers returns { google: false } and endpoints return 404 when unconfigured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const res = await request(app).get('/api/auth/providers');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ google: false });

      const googleRes = await request(app).get('/api/auth/google');
      expect(googleRes.status).toBe(404);

      const callbackRes = await request(app).get('/api/auth/google/callback');
      expect(callbackRes.status).toBe(404);
    });

    test('validateGoogleOAuthConfig throws in production when half-configured', () => {
      const prevNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.GOOGLE_CLIENT_ID = 'some-id';
      delete process.env.GOOGLE_CLIENT_SECRET;
      process.env.GOOGLE_REDIRECT_URI = 'http://localhost:5173/api/auth/google/callback';

      expect(() => googleAuthService.validateGoogleOAuthConfig()).toThrow(/half-configured/i);
      process.env.NODE_ENV = prevNodeEnv;
    });
  });

  describe('2. GET /api/auth/google & State/PKCE Generation', () => {
    test('generates valid auth URL, state cookie with SameSite=Lax, and PKCE parameters', async () => {
      const res = await request(app)
        .get('/api/auth/google?returnTo=/my-booking')
        .expect(302);

      const redirectLocation = res.headers.location;
      expect(redirectLocation).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(redirectLocation).toContain(`client_id=${encodeURIComponent(TEST_CLIENT_ID)}`);
      expect(redirectLocation).toContain(`redirect_uri=${encodeURIComponent(TEST_REDIRECT_URI)}`);
      expect(redirectLocation).toContain('response_type=code');
      expect(redirectLocation).toContain('scope=openid%20email%20profile');
      expect(redirectLocation).toContain('prompt=select_account');
      expect(redirectLocation).toContain('code_challenge_method=S256');

      // Extract cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const stateCookie = cookies.find((c) => c.startsWith('g_oauth_state='));
      expect(stateCookie).toBeDefined();
      expect(stateCookie).toContain('HttpOnly');
      expect(stateCookie).toContain('SameSite=Lax');
      expect(stateCookie).toContain('Path=/api/auth');

      // Verify that returnTo was saved inside signed cookie
      const rawCookieVal = stateCookie.split(';')[0].split('=')[1];
      const parsed = googleAuthService.verifyOAuthState(decodeURIComponent(rawCookieVal));
      expect(parsed).not.toBeNull();
      expect(parsed.returnTo).toBe('/my-booking');
      expect(parsed.state).toBeDefined();
      expect(parsed.codeVerifier).toBeDefined();
      expect(parsed.nonce).toBeDefined();
    });

    test('Open Redirect Defense: sanitizes returnTo targeting external URLs or protocol-relative paths', () => {
      expect(googleAuthService.sanitizeReturnTo('https://evil.com')).toBe('/');
      expect(googleAuthService.sanitizeReturnTo('http://evil.com/phish')).toBe('/');
      expect(googleAuthService.sanitizeReturnTo('//evil.com')).toBe('/');
      expect(googleAuthService.sanitizeReturnTo('/\\evil.com')).toBe('/');
      expect(googleAuthService.sanitizeReturnTo('\\evil.com')).toBe('/');
      expect(googleAuthService.sanitizeReturnTo('javascript:alert(1)')).toBe('/');
      expect(googleAuthService.sanitizeReturnTo('/legit-route')).toBe('/legit-route');
      expect(googleAuthService.sanitizeReturnTo('/profile?notice=1')).toBe('/profile?notice=1');
    });
  });

  describe('3. GET /api/auth/google/callback: Token Verification & Security Validations', () => {
    test('handles user cancellation (error=access_denied) with redirect to /?error=cancelled', async () => {
      const res = await request(app)
        .get('/api/auth/google/callback?error=access_denied')
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/?error=cancelled');
    });

    test('rejects request with wrong or tampered state', async () => {
      const signedState = googleAuthService.signOAuthState({
        state: 'correct-state-123',
        codeVerifier: 'verifier-abc',
        nonce: 'nonce-xyz',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      const res = await request(app)
        .get('/api/auth/google/callback?code=mock-code&state=WRONG-STATE')
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/?error=auth_failed');
    });

    test('rejects request when signed state cookie is expired', async () => {
      const expiredState = googleAuthService.signOAuthState({
        state: 'state-123',
        codeVerifier: 'verifier-abc',
        nonce: 'nonce-xyz',
        returnTo: '/',
        exp: Date.now() - 1000, // expired
      });

      const res = await request(app)
        .get('/api/auth/google/callback?code=mock-code&state=state-123')
        .set('Cookie', [`g_oauth_state=${expiredState}`])
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/?error=auth_failed');
    });

    test('rejects ID token with wrong or mismatched nonce', async () => {
      const state = 'state-nonce-test';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-abc',
        nonce: 'expected-nonce-999',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      // Mock OAuth2Client
      const mockClient = {
        getToken: jest.fn().mockResolvedValue({
          tokens: { id_token: 'fake-jwt-token' },
        }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: TEST_CLIENT_ID,
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'WRONG-NONCE',
            sub: 'google-sub-1',
            email: 'user1@testgoogle.com',
            email_verified: true,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      const res = await request(app)
        .get(`/api/auth/google/callback?code=mock-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/?error=auth_failed');
    });

    test('rejects ID token with wrong audience (aud mismatch)', async () => {
      const state = 'state-aud-test';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-abc',
        nonce: 'nonce-123',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      const mockClient = {
        getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'fake-jwt' } }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: 'wrong-client-id.apps.googleusercontent.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-123',
            sub: 'google-sub-1',
            email: 'user1@testgoogle.com',
            email_verified: true,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      const res = await request(app)
        .get(`/api/auth/google/callback?code=mock-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/?error=auth_failed');
    });

    test('rejects ID token with wrong issuer (iss mismatch)', async () => {
      const state = 'state-iss-test';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-abc',
        nonce: 'nonce-123',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      const mockClient = {
        getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'fake-jwt' } }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://evil-issuer.com',
            aud: TEST_CLIENT_ID,
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-123',
            sub: 'google-sub-1',
            email: 'user1@testgoogle.com',
            email_verified: true,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      const res = await request(app)
        .get(`/api/auth/google/callback?code=mock-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/?error=auth_failed');
    });

    test('rejects ID token when email_verified is false', async () => {
      const state = 'state-verified-test';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-abc',
        nonce: 'nonce-123',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      const mockClient = {
        getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'fake-jwt' } }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: TEST_CLIENT_ID,
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-123',
            sub: 'google-sub-1',
            email: 'unverified@testgoogle.com',
            email_verified: false,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      const res = await request(app)
        .get(`/api/auth/google/callback?code=mock-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/?error=email_unverified');
    });
  });

  describe('4. Account Rules & Pre-Hijacking Protection', () => {
    test('creates new customer with email_verified=1 and no password; sends to /profile for missing contact', async () => {
      const state = 'state-new-user';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-new-user',
        nonce: 'nonce-new-user',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      const newEmail = 'brand_new_user@testgoogle.com';
      const googleSub = 'google-sub-998877';

      const mockClient = {
        getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'token-new' } }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: TEST_CLIENT_ID,
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-new-user',
            sub: googleSub,
            email: newEmail,
            name: 'Brand New User',
            email_verified: true,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      const res = await request(app)
        .get(`/api/auth/google/callback?code=new-user-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      // Verifies redirection to /profile with notice for missing contact
      expect(res.headers.location).toBe('http://localhost:5173/profile?notice=missing_contact');

      // Verify cookies issued
      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
      expect(cookies.some((c) => c.startsWith('csrf_nonce='))).toBe(true);

      // Verify DB record
      const [rows] = await query('SELECT * FROM tblusers WHERE EmailId = ?', [newEmail]);
      expect(rows.length).toBe(1);
      const user = rows[0];
      expect(user.google_id).toBe(googleSub);
      expect(user.auth_provider).toBe('google');
      expect(user.email_verified).toBe(1);
      expect(user.Password).toBeNull();
      expect(user.password_hash).toBeNull();
      expect(user.ContactNo).toBeNull();
    });

    test('returning user matched by google_id logs in and redirects to returnTo', async () => {
      const email = 'returning_user@testgoogle.com';
      const googleSub = 'google-sub-112233';

      await query(
        `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, google_id, auth_provider, email_verified)
         VALUES ('Returning User', ?, '9876543210', NULL, NULL, ?, 'google', 1)`,
        [email, googleSub]
      );

      const state = 'state-returning';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-ret',
        nonce: 'nonce-ret',
        returnTo: '/my-booking',
        exp: Date.now() + 60000,
      });

      const mockClient = {
        getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'token-ret' } }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: TEST_CLIENT_ID,
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-ret',
            sub: googleSub,
            email,
            name: 'Returning User',
            email_verified: true,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      const res = await request(app)
        .get(`/api/auth/google/callback?code=ret-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      expect(res.headers.location).toBe('http://localhost:5173/my-booking');
    });

    test('PRE-HIJACKING DEFENSE: first Google link clears local password hash, revokes sessions, and sets email_verified=1', async () => {
      const email = 'victim_prehijack@testgoogle.com';
      const attackerPasswordHash = '$argon2id$v=19$m=65536,t=3,p=4$attacker-controlled-hash';

      const [insertRes] = await query(
        `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, auth_provider, email_verified)
         VALUES ('Victim User', ?, '9876543210', 'legacy_md5', ?, 'local', 0)`,
        [email, attackerPasswordHash]
      );
      const userId = insertRes.insertId;

      // Seed an attacker session
      await query(
        `INSERT INTO tbl_refresh_tokens (user_type, user_id, family_id, token_hash, is_revoked, expires_at)
         VALUES ('user', ?, 'attacker-family', 'attacker-token-hash', 0, NOW() + INTERVAL 7 DAY)`,
        [userId]
      );

      const state = 'state-prehijack';
      const googleSub = 'google-victim-sub-777';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-prehijack',
        nonce: 'nonce-prehijack',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      const mockClient = {
        getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'token-prehijack' } }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: TEST_CLIENT_ID,
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-prehijack',
            sub: googleSub,
            email,
            name: 'Victim User',
            email_verified: true,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      await request(app)
        .get(`/api/auth/google/callback?code=prehijack-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      // Verify DB state: password cleared, auth_provider set, email_verified=1
      const [updated] = await query('SELECT * FROM tblusers WHERE id = ?', [userId]);
      expect(updated[0].Password).toBeNull();
      expect(updated[0].password_hash).toBeNull();
      expect(updated[0].google_id).toBe(googleSub);
      expect(updated[0].auth_provider).toBe('google');
      expect(updated[0].email_verified).toBe(1);

      // Verify attacker's previous refresh tokens were completely revoked
      const [tokens] = await query('SELECT is_revoked FROM tbl_refresh_tokens WHERE family_id = "attacker-family"');
      expect(tokens[0].is_revoked).toBe(1);
    });

    test('password login for passwordless account fails with generic Invalid Details and dummy Argon2 execution', async () => {
      const email = 'passwordless_user@testgoogle.com';
      await query(
        `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, google_id, auth_provider, email_verified)
         VALUES ('Passwordless User', ?, '9876543210', NULL, NULL, 'google-sub-passless', 'google', 1)`,
        [email]
      );

      // Attempt password login with valid CSRF token
      const csrfNonce = 'test-nonce-passless';
      const csrfToken = generateCsrfToken(csrfNonce);

      const startTime = Date.now();
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [`csrf_nonce=${csrfNonce}`])
        .set('X-CSRF-Token', csrfToken)
        .send({ email, password: 'AttemptedPassword123!' });
      const duration = Date.now() - startTime;

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid Details');
      // Argon2id verification with 65536 memory cost typically takes > 30ms on modern CPUs
      expect(duration).toBeGreaterThan(20);
    });
  });

  describe('5. Admin Isolation Guarantee', () => {
    test('Google sign-in matching admin email/username creates only customer session and cannot access admin routes', async () => {
      const adminEmail = 'admin@example.com';
      const googleSub = 'google-sub-admin-impersonator';

      const state = 'state-admin-isolation';
      const signedState = googleAuthService.signOAuthState({
        state,
        codeVerifier: 'verifier-adm',
        nonce: 'nonce-adm',
        returnTo: '/',
        exp: Date.now() + 60000,
      });

      const mockClient = {
        getToken: jest.fn().mockResolvedValue({ tokens: { id_token: 'token-admin-impersonator' } }),
        verifyIdToken: jest.fn().mockResolvedValue({
          getPayload: () => ({
            iss: 'https://accounts.google.com',
            aud: TEST_CLIENT_ID,
            exp: Math.floor(Date.now() / 1000) + 3600,
            nonce: 'nonce-adm',
            sub: googleSub,
            email: adminEmail,
            name: 'admin',
            email_verified: true,
          }),
        }),
      };
      googleAuthService.setClientForTesting(mockClient);

      const res = await request(app)
        .get(`/api/auth/google/callback?code=adm-code&state=${state}`)
        .set('Cookie', [`g_oauth_state=${signedState}`])
        .expect(302);

      // Extract access_token
      const cookies = res.headers['set-cookie'];
      const accessCookie = cookies.find((c) => c.startsWith('access_token='));
      expect(accessCookie).toBeDefined();

      const rawJwt = accessCookie.split(';')[0].split('=')[1];
      const decoded = verifyAccessToken(rawJwt);
      expect(decoded.role).toBe('user'); // MUST be user, NEVER admin!

      // Assert admin table in DB was not touched
      const [adminRows] = await query('SELECT * FROM admin WHERE UserName = "admin"');
      expect(adminRows.length).toBe(1);
      expect(adminRows[0].Password).toBeDefined();

      // Assert this token is rejected with 403 Forbidden on admin routes
      const adminAccessRes = await request(app)
        .get('/api/admin/bookings')
        .set('Cookie', [`access_token=${rawJwt}`]);
      expect(adminAccessRes.status).toBe(403);
    });
  });

  describe('6. Google OAuth Rate Limiter', () => {
    test('googleAuthLimiter rate limits rapid successive attempts', async () => {
      process.env.TEST_RATE_LIMIT = 'true';
      const originalMax = process.env.RATE_LIMIT_GOOGLE_AUTH_MAX;
      process.env.RATE_LIMIT_GOOGLE_AUTH_MAX = '3';

      try {
        for (let i = 0; i < 3; i++) {
          await request(app).get('/api/auth/google');
        }
        const blockedRes = await request(app).get('/api/auth/google');
        expect(blockedRes.status).toBe(429);
        expect(blockedRes.body.error).toMatch(/too many attempts/i);
      } finally {
        delete process.env.TEST_RATE_LIMIT;
        if (originalMax) process.env.RATE_LIMIT_GOOGLE_AUTH_MAX = originalMax;
        else delete process.env.RATE_LIMIT_GOOGLE_AUTH_MAX;
      }
    });
  });
});
