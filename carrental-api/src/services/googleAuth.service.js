'use strict';
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../db/pool');
const { auditLog } = require('../utils/auditLogger');
const { signAccessToken } = require('../utils/jwt');
const { AuthError, NotFoundError } = require('../utils/errors');
const authService = require('./auth.service');

const STATE_SECRET = process.env.CSRF_SECRET || process.env.JWT_ACCESS_SECRET || 'dev_oauth_state_signing_key_change_in_prod';

let customOAuth2Client = null;

function isGoogleConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const uri = process.env.GOOGLE_REDIRECT_URI;
  return Boolean(id && id.trim() && secret && secret.trim() && uri && uri.trim());
}

function getOAuth2Client() {
  if (customOAuth2Client) return customOAuth2Client;
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
  const standardClient = new OAuth2Client(clientId, clientSecret, redirectUri);

  if (process.env.MOCK_OIDC_URL && process.env.NODE_ENV !== 'production') {
    const mockUrl = process.env.MOCK_OIDC_URL.replace(/\/$/, '');
    return {
      generateAuthUrl: (opts) => standardClient.generateAuthUrl(opts),
      getToken: async ({ code, codeVerifier }) => {
        const res = await fetch(`${mockUrl}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, codeVerifier }),
        });
        if (!res.ok) throw new Error(`Mock OIDC token endpoint error: ${res.status}`);
        const data = await res.json();
        return { tokens: data };
      },
      verifyIdToken: async ({ idToken, audience }) => {
        const res = await fetch(`${mockUrl}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, audience }),
        });
        if (!res.ok) throw new Error(`Mock OIDC verify endpoint error: ${res.status}`);
        const payload = await res.json();
        return { getPayload: () => payload };
      },
    };
  }

  return standardClient;
}

function setClientForTesting(client) {
  customOAuth2Client = client;
}

function resetClient() {
  customOAuth2Client = null;
}

/**
 * Report status ("set" or "missing") without revealing secrets.
 */
function reportGoogleAuthConfig() {
  const vars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'FRONTEND_URL'];
  console.log('[oauth-config] Google OAuth configuration check:');
  vars.forEach((v) => {
    const isSet = Boolean(process.env[v] && process.env[v].trim() !== '');
    console.log(`  - ${v}: ${isSet ? 'set' : 'missing'}`);
  });
}

/**
 * Fail loudly in production if Google OAuth credentials are half-configured.
 */
function validateGoogleOAuthConfig() {
  const hasId = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.trim());
  const hasSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.trim());
  const hasUri = Boolean(process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.trim());

  const count = [hasId, hasSecret, hasUri].filter(Boolean).length;
  if (count > 0 && count < 3) {
    const msg = 'Google OAuth is half-configured: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must all be set or all be empty.';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[FATAL] ${msg}`);
    } else {
      console.warn(`[SECURITY WARNING] ${msg}`);
    }
  }
}

/**
 * Strictly sanitize returnTo: must be a relative path starting with a single '/'
 * Rejects absolute URLs, protocol-relative '//', backslashes '\', and invalid characters.
 */
function sanitizeReturnTo(returnTo) {
  if (typeof returnTo !== 'string') return '/';
  const trimmed = returnTo.trim();
  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.includes('\\') &&
    !trimmed.includes('://')
  ) {
    return trimmed;
  }
  return '/';
}

/**
 * Sign OAuth state to ensure integrity and prevent tampering during redirection.
 */
function signOAuthState(payload) {
  const jsonStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto.createHmac('sha256', STATE_SECRET).update(base64Payload).digest('base64url');
  return `${base64Payload}.${signature}`;
}

/**
 * Verify and decode signed OAuth state cookie.
 */
function verifyOAuthState(cookieToken) {
  if (!cookieToken || typeof cookieToken !== 'string') return null;
  const parts = cookieToken.split('.');
  if (parts.length !== 2) return null;
  const [base64Payload, signature] = parts;

  const expectedSignature = crypto.createHmac('sha256', STATE_SECRET).update(base64Payload).digest('base64url');
  if (signature.length !== expectedSignature.length) return null;

  const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  if (!valid) return null;

  try {
    const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Cookie options for the short-lived, signed OAuth state cookie.
 * SameSite MUST be 'lax' (NOT 'strict') so the browser includes it when Google navigates back.
 */
function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/api/auth',
  };
}

/**
 * Generate authorization URL with PKCE, state, and nonce.
 */
function generateAuthFlow(returnToParam) {
  if (!isGoogleConfigured()) {
    throw new NotFoundError('Google sign-in is not configured');
  }

  const returnTo = sanitizeReturnTo(returnToParam);
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const nonce = crypto.randomBytes(32).toString('hex');
  const exp = Date.now() + 10 * 60 * 1000;

  const stateToken = signOAuthState({
    state,
    codeVerifier,
    nonce,
    returnTo,
    exp,
  });

  const client = getOAuth2Client();
  const authUrl = client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    nonce,
  });

  return {
    authUrl,
    stateToken,
    cookieOptions: oauthStateCookieOptions(),
  };
}

/**
 * Process the callback from Google.
 * Performs state verification, PKCE code exchange, ID token validation, and account handling.
 */
async function processCallback({ code, state, cookieToken, error, errorDescription, ip = '0.0.0.0' }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  if (!isGoogleConfigured()) {
    throw new NotFoundError('Google sign-in is not configured');
  }

  // 1. Handle user cancellation or provider error
  if (error) {
    if (error === 'access_denied') {
      auditLog('GOOGLE_LOGIN_CANCELLED', { ip, details: { reason: 'user_cancelled_at_provider' } });
      return {
        success: false,
        redirectUrl: `${frontendUrl}/?error=cancelled`,
      };
    }
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: error || 'provider_error' } });
    return {
      success: false,
      redirectUrl: `${frontendUrl}/?error=auth_failed`,
    };
  }

  // 2. State & Cookie verification
  if (!code || !state || !cookieToken) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'missing_code_or_state' } });
    return {
      success: false,
      redirectUrl: `${frontendUrl}/?error=auth_failed`,
    };
  }

  const savedState = verifyOAuthState(cookieToken);
  if (!savedState || savedState.state !== state) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'state_mismatch_or_expired' } });
    return {
      success: false,
      redirectUrl: `${frontendUrl}/?error=auth_failed`,
    };
  }

  const returnTo = sanitizeReturnTo(savedState.returnTo);

  // 3. Exchange code with PKCE
  const client = getOAuth2Client();
  let tokens;
  try {
    const resToken = await client.getToken({
      code,
      codeVerifier: savedState.codeVerifier,
    });
    tokens = resToken.tokens;
  } catch (err) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'token_exchange_failed' } });
    return {
      success: false,
      redirectUrl: `${frontendUrl}/?error=auth_failed`,
    };
  }

  if (!tokens || !tokens.id_token) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'missing_id_token' } });
    return {
      success: false,
      redirectUrl: `${frontendUrl}/?error=auth_failed`,
    };
  }

  // 4. Verify ID Token
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'id_token_verification_failed' } });
    return {
      success: false,
      redirectUrl: `${frontendUrl}/?error=auth_failed`,
    };
  }

  if (!payload) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'empty_payload' } });
    return {
      success: false,
      redirectUrl: `${frontendUrl}/?error=auth_failed`,
    };
  }

  // Claims validation: issuer, audience, exp, nonce
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (process.env.MOCK_OIDC_ISSUER) {
    validIssuers.push(process.env.MOCK_OIDC_ISSUER);
  }
  if (!validIssuers.includes(payload.iss)) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'invalid_issuer' } });
    return { success: false, redirectUrl: `${frontendUrl}/?error=auth_failed` };
  }

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'audience_mismatch' } });
    return { success: false, redirectUrl: `${frontendUrl}/?error=auth_failed` };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < nowSec) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'token_expired' } });
    return { success: false, redirectUrl: `${frontendUrl}/?error=auth_failed` };
  }

  if (payload.nonce && payload.nonce !== savedState.nonce) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'nonce_mismatch' } });
    return { success: false, redirectUrl: `${frontendUrl}/?error=auth_failed` };
  }

  // Strict email verification requirement
  if (payload.email_verified !== true && payload.email_verified !== 'true') {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'email_not_verified' } });
    return { success: false, redirectUrl: `${frontendUrl}/?error=email_unverified` };
  }

  const googleId = String(payload.sub || '');
  const email = (payload.email || '').trim().toLowerCase();
  const fullName = (payload.name || payload.given_name || email.split('@')[0] || 'Google User').trim();

  if (!googleId || !email) {
    auditLog('GOOGLE_LOGIN_FAILED', { ip, details: { reason: 'missing_sub_or_email' } });
    return { success: false, redirectUrl: `${frontendUrl}/?error=auth_failed` };
  }

  // 5. Account Rules & Pre-hijacking Protection
  let user;
  let isNewUserWithoutContact = false;

  // 5a. Match first by google_id
  const [byGoogleId] = await query(
    'SELECT id, FullName, EmailId, ContactNo, Password, password_hash, auth_provider, email_verified FROM tblusers WHERE google_id = ?',
    [googleId]
  );

  if (byGoogleId.length > 0) {
    const existing = byGoogleId[0];
    if (!existing.email_verified) {
      await query('UPDATE tblusers SET email_verified = 1 WHERE id = ?', [existing.id]);
    }
    user = {
      id: existing.id,
      email: existing.EmailId,
      fullname: existing.FullName,
      role: 'user',
    };
    if (!existing.ContactNo) {
      isNewUserWithoutContact = true;
    }
    auditLog('GOOGLE_LOGIN_SUCCESS', {
      actorType: 'user',
      actorId: user.id,
      ip,
      details: { email },
    });
  } else {
    // 5b. Match by email (pre-hijacking defense on first link)
    const [byEmail] = await query(
      'SELECT id, FullName, EmailId, ContactNo, Password, password_hash, auth_provider, google_id FROM tblusers WHERE EmailId = ?',
      [email]
    );

    if (byEmail.length > 0) {
      const localAccount = byEmail[0];
      // Revoke old password, revoke all refresh tokens and sessions, update provider & google_id
      await query(
        `UPDATE tblusers
         SET Password = NULL,
             password_hash = NULL,
             google_id = ?,
             auth_provider = 'google',
             email_verified = 1
         WHERE id = ?`,
        [googleId, localAccount.id]
      );
      await authService.revokeAllUserSessions('user', localAccount.id);

      user = {
        id: localAccount.id,
        email: localAccount.EmailId,
        fullname: localAccount.FullName,
        role: 'user',
      };
      if (!localAccount.ContactNo) {
        isNewUserWithoutContact = true;
      }
      auditLog('GOOGLE_ACCOUNT_LINKED', {
        actorType: 'user',
        actorId: user.id,
        ip,
        details: { email, action: 'cleared_password_and_revoked_sessions' },
      });
    } else {
      // 5c. Create new customer
      const [createRes] = await query(
        `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, google_id, auth_provider, email_verified)
         VALUES (?, ?, NULL, NULL, NULL, ?, 'google', 1)`,
        [fullName, email, googleId]
      );

      user = {
        id: createRes.insertId,
        email,
        fullname: fullName,
        role: 'user',
      };
      isNewUserWithoutContact = true;

      auditLog('GOOGLE_ACCOUNT_CREATED', {
        actorType: 'user',
        actorId: user.id,
        ip,
        details: { email },
      });
    }
  }

  // 6. Issue standard customer sessions (access token, refresh token family, fresh CSRF nonce)
  const accessToken = signAccessToken(user);
  const { refreshToken } = await authService.createRefreshTokenSession('user', user.id);
  const csrfNonce = crypto.randomBytes(16).toString('hex');

  // Determine redirect URL
  let redirectUrl = `${frontendUrl}${returnTo}`;
  if (isNewUserWithoutContact && returnTo === '/') {
    redirectUrl = `${frontendUrl}/profile?notice=missing_contact`;
  }

  return {
    success: true,
    user,
    accessToken,
    refreshToken,
    csrfNonce,
    redirectUrl,
  };
}

module.exports = {
  isGoogleConfigured,
  getOAuth2Client,
  setClientForTesting,
  resetClient,
  reportGoogleAuthConfig,
  validateGoogleOAuthConfig,
  sanitizeReturnTo,
  signOAuthState,
  verifyOAuthState,
  oauthStateCookieOptions,
  generateAuthFlow,
  processCallback,
};
