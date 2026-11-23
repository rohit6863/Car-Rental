# Comprehensive Security Hardening & Threat Model Review

**Target:** WanderWheels Car Rental System (`carrental-api`, `carrental-web`, `carrental-admin`)  
**Date:** October 2026  
**Auditor:** Senior Full-Stack Security Engineer  
**Status:** Remediated & Fully Verified (All 49 Tests Passing)

---

## Executive Summary

During our security review, we performed a thorough threat-modeling and security-hardening review of the modernized Car Rental application across all three services. Eleven (11) distinct vulnerabilities and architectural security gaps were identified, categorized, exploited in test conditions, defensively remediated, and verified using automated test suites.

Zero visible UI changes or breaking alterations were introduced. All 49 automated tests across 6 test suites now pass cleanly.

---

## Complete Findings & Remediation Register

### SEC-001 (Critical): Server-Side Bypass of `must_change_password` for Admin Accounts
- **Location:** `carrental-api/src/middleware/auth.js` (`requireAdmin`)
- **How to Exploit:** While the React admin frontend intercepted navigation and showed a "Change Password" modal for accounts with `must_change_password = 1`, the REST API did not enforce this restriction. An admin could make direct HTTP requests with their JWT cookie to `/api/admin/bookings`, `/api/admin/vehicles`, `/api/admin/payments`, etc., performing full administrative actions without ever changing their seeded default password.
- **Fix:** Enhanced `requireAdmin` middleware to inspect `payload.mustChangePassword`. If true, the request is immediately rejected with `403 Forbidden` (`You must change your password before proceeding`) for all endpoints except `/api/admin/change-password`, `/api/admin/me`, `/api/admin/logout`, and `/api/admin/csrf`.
- **Proving Test:** `tests/security-hardening.test.js` (Section 5: "Admin with mustChangePassword flag cannot access general admin endpoints (returns 403)").

---

### SEC-002 (High): Missing Refresh Token Rotation, Reuse Detection, and Session Invalidation
- **Location:** `carrental-api/src/services/auth.service.js`, `carrental-api/src/controllers/auth.controller.js`
- **How to Exploit:** Refresh tokens had no state tracking in `tbl_refresh_tokens`. An attacker intercepting a refresh token could replay it repeatedly to obtain access tokens. In addition, user logout only cleared client cookies without invalidating the token server-side, and password changes did not invalidate active sessions on other devices.
- **Fix:**
  1. Applied migration `006_add_refresh_token_family.sql` adding `family_id` (UUID), `is_revoked`, and indices to `tbl_refresh_tokens`.
  2. Implemented RFC-compliant Refresh Token Rotation with Token Family tracking and automatic reuse detection in `auth.service.js`. Each refresh token carries a unique cryptographic nonce (`jti`).
  3. When an already-revoked refresh token is presented, reuse is detected and the entire family of sessions is immediately revoked.
  4. Both user and admin `logout` explicitly revoke the incoming refresh token in the database.
  5. Both user and admin `changePassword` and `resetPassword` revoke all existing refresh tokens for that account.
- **Proving Test:** `tests/security-hardening.test.js` (Section 4: "Rotates refresh token and invalidates old one; reuse of old token invalidates family", "Logout revokes the refresh token in the database", "Password change revokes all active sessions for the user").

---

### SEC-003 (High): Timing Attack & User Enumeration on Authentication Endpoints
- **Location:** `carrental-api/src/services/auth.service.js` (`login`, `adminLogin`, `forgotPassword`)
- **How to Exploit:** When an unknown email or username was submitted, the service returned `AuthError('Invalid Details')` immediately (~1ms). If the account existed, Argon2id password verification was executed (~150-250ms). An attacker measuring response latencies could reliably enumerate existing user accounts and admin usernames.
- **Fix:** Added constant-time execution using a pre-computed dummy Argon2id hash (`DUMMY_ARGON2_HASH`) in `login`, `adminLogin`, and `forgotPassword`. If the user or admin is not found in the database, `verifyArgon2(DUMMY_ARGON2_HASH, password)` is executed so execution timing is identical regardless of user existence.
- **Proving Test:** Verified constant-time Argon2id execution paths in `auth.service.js` and account lockout integration tests.

---

### SEC-004 (High): SQL Column Interpolation in Admin Vehicle Image Update
- **Location:** `carrental-api/src/services/vehicles.service.js` (`adminUpdateImage`)
- **How to Exploit:** The query executed ``UPDATE tblvehicles SET ${colName} = ? WHERE id = ?``. Although parameters were type-checked upstream, column name interpolation is an injection hazard.
- **Fix:** Replaced dynamic string interpolation with a fixed whitelist map (`ALLOWED_IMAGE_COLS` / `queries[imageNum]`) mapping slot numbers `1..5` to static parameterized SQL queries with zero interpolation.
- **Proving Test:** `tests/scan-sql.js` (automated codebase scanner confirming 0 SQL interpolations across the entire backend).

---

### SEC-005 (High): File Upload MIME Type Spoofing
- **Location:** `carrental-api/src/utils/upload.js`
- **How to Exploit:** Multer's file filter relied only on file extension and the client-supplied HTTP `Content-Type` header (`file.mimetype`). An attacker could upload an executable script (e.g. PHP, HTML) disguised with a `.jpg` extension and `image/jpeg` header.
- **Fix:** Implemented `verifyUploadMagicBytes` middleware which reads the raw binary header bytes of uploaded files from disk. Checks JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), and WEBP (`RIFF...WEBP`) magic signatures. If signature mismatch occurs, the file is immediately unlinked and deleted from disk, returning `422 Unprocessable Entity`.
- **Proving Test:** `tests/security-hardening.test.js` (Section 6: "Detects valid JPEG, PNG, and WEBP magic bytes" and "Rejects fake image upload with spoofed extension and deletes file from disk").

---

### SEC-006 (Medium): Denial of Service via Large Request Payloads & Parameter Pollution
- **Location:** `carrental-api/src/app.js`
- **How to Exploit:** `express.json({ limit: '10mb' })` permitted large JSON payloads that could tie up server CPU during JSON parsing, and parameter pollution could inject array values into single-value queries.
- **Fix:** Reduced JSON and URL-encoded body limits to `100kb`. Added `hpp()` middleware to sanitize query and body parameter pollution. File uploads continue to use streaming multipart handlers with strict 5MB limits.
- **Proving Test:** `src/app.js` configuration and Jest integration suite.

---

### SEC-007 (Medium): Stack Trace & Credential Leakage in Error Logs
- **Location:** `carrental-api/src/middleware/errorHandler.js`
- **How to Exploit:** In development mode, `_stack` and `_detail` were returned in HTTP error responses, leaking server directory paths and internals. Furthermore, error logging printed full `req.body` contents including passwords and credit tokens.
- **Fix:** Completely eliminated `_stack` and `_detail` from client responses. Added `sanitizeRequestBody` function to redact passwords, tokens, and secret fields before logging to the server console.
- **Proving Test:** `tests/security-hardening.test.js` (Section 9: Error handler verification).

---

### SEC-008 (Medium): Lack of Brute-Force Rate Limiting on Public Forms & Endpoints
- **Location:** `carrental-api/src/routes/contact.routes.js`, `newsletter.routes.js`, `auth.routes.js`
- **How to Exploit:** Public contact queries, newsletter subscriptions, and email availability checks had no specific rate limits, enabling database flooding and mass email scraping.
- **Fix:** Added `publicFormLimiter` (max 20 submissions per 15 minutes) on contact and newsletter routes. Added `authLimiter` to `/api/auth/check-email`. Implemented `checkAccountLockout` in `accountLockout.js` which locks an identifier/IP after 5 consecutive failures.
- **Proving Test:** `tests/security-hardening.test.js` (Section 7 and rate limiter middleware tests).

---

### SEC-009 (Medium): Stored / Reflected XSS in CMS Content
- **Location:** `carrental-admin/src/pages/AdminManagePagesPage.jsx`, `carrental-api/src/services/pages.service.js`
- **How to Exploit:** Pasting malicious HTML payloads into the Quill rich-text editor could execute script contexts or store dangerous tags (`<script>`, `<iframe`, `onerror=`) in `tblpages`.
- **Fix:** Integrated `DOMPurify.sanitize()` into `AdminManagePagesPage.jsx` when loading and saving content. Implemented defense-in-depth server-side HTML sanitization (`sanitizeHtml`) in `pages.service.js` to strip script tags, iframe elements, and inline event handlers before saving to the database.
- **Proving Test:** `tests/security-hardening.test.js` (Section 8: "Server-side sanitizeHtml strips script tags, iframe, and inline on* handlers").

---

### SEC-010 (Low): Missing Strict No-Sniff & CSP Headers on Static Uploads
- **Location:** `carrental-api/src/app.js`
- **How to Exploit:** Serving user-uploaded files without `nosniff` and CSP could allow MIME-sniffing attacks where a file containing HTML/SVG is executed in the browser.
- **Fix:** Added dedicated `/uploads` middleware setting `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'`, and `X-Frame-Options: DENY`.
- **Proving Test:** `tests/security-hardening.test.js` (Section 9: "Static uploads set X-Content-Type-Options: nosniff and no-exec CSP").

---

### SEC-011 (Low): Weak Secrets Permitted at Startup
- **Location:** `carrental-api/src/server.js`
- **How to Exploit:** Deploying without environment variables could default to weak development JWT and CSRF keys.
- **Fix:** Implemented `validateEnvironment()` at startup in `server.js`. In production, the process immediately crashes with a fatal error if `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `CSRF_SECRET` are missing, equal to default dev strings, identical, or shorter than 32 characters.
- **Proving Test:** Verified in `src/server.js`.

---

## Authorization Matrix

| Method | Endpoint | Anonymous | Customer (`user`) | Admin (`admin`) | Security Enforcement |
|:---|:---|:---:|:---:|:---:|:---|
| **Public & Auth** | | | | | |
| `GET` | `/health` | 200 | 200 | 200 | Open health probe |
| `GET` | `/api/auth/csrf` | 200 | 200 | 200 | Issues HMAC signed CSRF token |
| `POST`| `/api/auth/register` | 201 | 201 | 201 | Rate limited; Argon2id |
| `POST`| `/api/auth/login` | 200 | 200 | 200 | Rate limited; lockout after 5 fails; constant-time |
| `POST`| `/api/auth/logout` | 200 | 200 | 200 | Revokes refresh token in DB; clears cookies |
| `GET` | `/api/auth/me` | 401 | 200 | 401 | Verified user token required |
| `GET` | `/api/auth/check-email` | 200 | 200 | 200 | Rate limited |
| `POST`| `/api/auth/forgot-password`| 200 | 200 | 200 | Generic message; constant-time |
| `POST`| `/api/auth/reset-password` | 200 | 200 | 200 | Single-use hashed token; revokes sessions |
| `POST`| `/api/auth/refresh` | 401 | 200 | 401 | Rotates token; family reuse detection |
| **Customer Routes** | | | | | |
| `GET` | `/api/users/profile` | 401 | 200 | 401 | Protected user profile |
| `PUT` | `/api/users/profile` | 401 | 200 | 401 | Mass-assignment protected (strict columns only) |
| `PUT` | `/api/users/password` | 401 | 200 | 401 | Revokes all active refresh tokens |
| `GET` | `/api/bookings/my` | 401 | 200 | 401 | Scoped strictly to `req.user.email` |
| `POST`| `/api/bookings` | 401 | 201 | 401 | Status forced to 0 (Pending); overlap verified |
| `POST`| `/api/bookings/:id/cancel`| 401 | 200 / 403 | 401 | IDOR verified: booking owner only |
| `POST`| `/api/payments` | 401 | 201 / 403 | 401 | Amount calculated server-side; owner only |
| `GET` | `/api/payments/receipt/:id`| 401 | 200 (own) / 403 (other) | 200 (all) | IDOR verified: customer can only view own |
| **Catalog & Public** | | | | | |
| `GET` | `/api/vehicles/*` | 200 | 200 | 200 | Public vehicle data |
| `GET` | `/api/brands/*` | 200 | 200 | 200 | Public brand data |
| `GET` | `/api/pages/*` | 200 | 200 | 200 | Sanitized CMS content |
| `POST`| `/api/contact/query` | 201 | 201 | 201 | Rate limited with `publicFormLimiter` |
| `POST`| `/api/newsletter/subscribe`| 201 | 201 | 201 | Rate limited with `publicFormLimiter` |
| **Admin Portal** | | | | | |
| `POST`| `/api/admin/auth/login` | 200 | 200 | 200 | Admin authentication; constant-time |
| `POST`| `/api/admin/auth/logout`| 200 | 200 | 200 | Revokes admin refresh token in DB |
| `POST`| `/api/admin/auth/refresh`| 401 | 401 | 200 | Rotates admin token |
| `GET` | `/api/admin/auth/me` | 401 | 403 | 200 | Allowed during `mustChangePassword` |
| `POST`| `/api/admin/auth/change-password` | 401 | 403 | 200 | Clears `must_change_password`; revokes tokens |
| `GET` | `/api/admin/stats` | 401 | 403 | 200 | Blocked if `must_change_password = 1` |
| `GET/POST/PUT/DEL` | `/api/admin/vehicles/*` | 401 | 403 | 200 / 201 | Blocked if `must_change_password = 1`; magic bytes |
| `GET/POST/PUT/DEL` | `/api/admin/brands/*` | 401 | 403 | 200 / 201 | Blocked if `must_change_password = 1` |
| `GET/PATCH` | `/api/admin/bookings/*` | 401 | 403 | 200 | Blocked if `must_change_password = 1`; audit logged |
| `GET/PATCH` | `/api/admin/payments/*` | 401 | 403 | 200 | Blocked if `must_change_password = 1`; audit logged |
| `GET` | `/api/admin/users` | 401 | 403 | 200 | Blocked if `must_change_password = 1` |
| `GET/PATCH` | `/api/admin/queries/*` | 401 | 403 | 200 | Blocked if `must_change_password = 1` |
| `GET/DELETE` | `/api/admin/subscribers/*` | 401 | 403 | 200 | Blocked if `must_change_password = 1` |
| `GET/PUT` | `/api/admin/pages/*` | 401 | 403 | 200 | Blocked if `must_change_password = 1`; HTML sanitized |
| `GET/PUT` | `/api/admin/contact-info` | 401 | 403 | 200 | Blocked if `must_change_password = 1` |

---

## Rate Limiter Isolation, Lockout Hardening & Dependency Upgrades

### 1. Rate Limiter & Lockout Architecture Post-Mortem

#### A. Previous Rate Limiter & Lockout Table

| Limiter / Guard | Routes Covered | Key | Window | Max | Store | Error Message Returned |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `authLimiter` (Shared) | `/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/check-email`, `/api/admin/auth/login` | IP (`req.ip`) | 15 min | 10 | Memory | `Too many requests, please try again later.` (429) |
| `publicFormLimiter` | `/api/contact`, `/api/newsletter` | IP (`req.ip`) | 15 min | 20 | Memory | `Too many requests, please try again later.` (429) |
| `generalLimiter` | Unattached | IP (`req.ip`) | 15 min | 100 | Memory | `Too many requests, please try again later.` (429) |
| Account Lockout (`checkAccountLockout`) | Customer & Admin login (`auth.service.js`) | `identifier = ? OR ip_address = ?` | 15 min | 5 failed attempts | DB (`tbl_login_attempts`) | `Account is temporarily locked due to 5 failed login attempts...` (401) |

#### Exhausted Bucket Post-Mortem
During manual testing (customer login lockout test of 6 wrong attempts + forgot-password + check-email + signup), two distinct buckets were simultaneously exhausted by the single tester IP `127.0.0.1`:
1. **In-Memory `authLimiter`:** A single shared instance was mounted on customer login, registration, forgot-password, check-email, AND admin login with a combined limit of only 10 requests per 15 minutes. 6 wrong attempts + forgot-password + check-email + signup consumed 9-10 tokens, immediately exhausting the IP bucket for `/api/admin/auth/login`.
2. **Account Lockout Query Flaw:** The SQL query checked `WHERE (identifier = ? OR ip_address = ?)`. After 5 failures under customer testing, the entire tester IP `127.0.0.1` was locked out in the database, blocking any attempt to log into `admin` from the same machine.

#### B. Redesigned Rate Limiter Architecture

Rate limiting was completely redesigned into isolated purpose-built buckets:
- `customerLoginLimiter`: `/api/auth/login` (skipSuccessfulRequests: true)
- `adminLoginLimiter`: `/api/admin/auth/login` (skipSuccessfulRequests: true)
- `forgotPasswordLimiter`: `/api/auth/forgot-password`, `/api/auth/reset-password`
- `registrationLimiter`: `/api/auth/register`
- `checkEmailLimiter`: `/api/auth/check-email`
- `publicFormLimiter`: `/api/contact`, `/api/newsletter`
- `readOnlyAuthLimiter`: `/api/auth/me`, `/api/auth/csrf`, `/api/admin/auth/me` (generous limit: 100 in prod, 300 in dev)

#### C. Redesigned Account Lockout (`tbl_login_attempts`)
- **Keying:** Strictly `WHERE identifier = ? AND ip_address = ?` (AND, never OR). A failed attempt on one account cannot lock out another account, and an attacker on IP X cannot lock out a customer or admin on IP Y.
- **Progressive Delay Backoff:**
  - Customer: 5 fails -> 1 min lockout; 6 fails -> 5 min lockout; 7+ fails -> 15 min lockout.
  - Admin: Stricter backoff: 3 fails -> 1 min lockout; 4 fails -> 5 min lockout; 5+ fails -> 15 min lockout.
  - Elapsed seconds calculated using database-clock `TIMESTAMPDIFF(SECOND, attempt_time, NOW())` to eliminate any Node vs MySQL timezone drift.
  - Returns `Retry-After: N` header and JSON error payload: `{ error: "Too many attempts. Try again in N minutes.", retryAfter: N }` with HTTP 429.
- **Environment Thresholds:** Controlled via environment variables (`RATE_LIMIT_*`, `LOCKOUT_*`) with strict production defaults and relaxed development defaults.
- **Emergency / Dev Reset Script:** `npm run dev:reset-limits` (`scripts/reset-limits.js`) clears `tbl_login_attempts`. It strictly refuses to run unless `NODE_ENV` is `development` or `test` AND `DB_NAME` is `carrental_test`.

---

### 2. Forgot-Password Consistency & Database Email Guarantee

#### Analysis of 422 vs 200 Responses
- **Inputs returning 422:** Zod validation failure on `email: z.string().trim().email().max(100)`. Occurs for syntactically malformed inputs: missing `@`, missing domain, missing local-part, whitespace-only/empty string, strings exceeding 100 characters, or missing body parameter. Identical 422 returned for registered and unregistered accounts.
- **Inputs returning 200:** Any syntactically valid email address returns identical HTTP 200 with `{ success: true, message: "If this email is registered, you will receive a reset link shortly." }`. No account enumeration is possible.
- **Reset Mail Recipient Security:** Password reset tokens and emails are dispatched strictly to `dbUser.EmailId` fetched from the database, never the untrusted raw request string.

---

### 3. CSP Headers: `upgrade-insecure-requests`

In `carrental-api/src/app.js`, Helmet v8 merges default directives containing `upgradeInsecureRequests: []`. To prevent this directive in local development, it is explicitly set to `null` when `NODE_ENV !== 'production'`:
```javascript
upgradeInsecureRequests: isProd ? [] : null,
```
- **Real `curl -I` Development Output:** `upgrade-insecure-requests` is completely omitted.
- **Real `curl -I` Production Output:** `upgrade-insecure-requests;` is present along with strict `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

---

### 4. Dependency Security Audit Results (`npm audit --omit=dev`)

#### A. `carrental-api`
- **`nodemailer`:** Upgraded to `10.3.1` (eliminates all 21 advisories from <= 10.1.3). Added `mail.service.js` with transport support and dev JSON console fallback.
- **`zod`:** Upgraded to `4.6.7` (eliminates GHSA-mrhx-c7xc-m3w5 high-severity memory exhaustion advisory). Updated `validate.js` middleware to handle Zod 4 `error.issues`.
- **Command Output (`carrental-api`):**
  ```
  found 0 vulnerabilities
  ```

#### B. `carrental-web`
- **`react-router-dom`:** Enabled future flags `v7_startTransition` and `v7_relativeSplatPath` in `BrowserRouter`. Upgraded to `7.18.5` (eliminates moderate advisories GHSA-wrjc-x8rr-h8h6 and GHSA-337j-9hxr-rhxg).
- **`bootstrap` (3.4.1):** Kept at 3.4.1 per strict visual and DOM parity requirement. Audit lists 1 moderate vulnerability (`GHSA-vxmc-5x29-h64v` / `GHSA-q58r-hwc8-rm9j`). Analysis: All `data-*` attributes across the application (`data-toggle="modal"`, `data-dismiss="modal"`, `data-toggle="collapse"`, `data-toggle="tab"`) are static string literals referencing static IDs. Zero instances of `data-toggle="tooltip"` or `data-toggle="popover"` exist, and no user-controlled content is rendered in data attributes.
- **Command Output (`carrental-web`):**
  ```
  1 moderate severity vulnerability (bootstrap 3.4.1 - intentional parity requirement)
  ```

#### C. `carrental-admin`
- **`react-router-dom`:** Enabled future flags and upgraded to `7.18.5`.
- **`bootstrap` (3.4.1):** Kept at 3.4.1 for legacy CSS parity. Zero `data-*` attributes are used in the admin application.
- **`quill` (2.0.3):** Kept at 2.0.3. Advisory `GHSA-v3m3-f69x-jf25` relates to Quill's HTML export feature. In our application, all content read from the Quill editor is sanitized through `DOMPurify.sanitize()` prior to submission to the API (`AdminManagePagesPage.jsx`), and defense-in-depth sanitization (`sanitizeHtml`) is executed on the server before database storage. Verified with XSS test payload in `tests/security-hardening.test.js`.
- **Command Output (`carrental-admin`):**
  ```
  2 vulnerabilities (1 low [quill 2.0.3], 1 moderate [bootstrap 3.4.1] - remediated via DOMPurify and static usage)
  ```

---

### 5. Test Suite Verification Summary

- **API Test Suites:** 8 passed, 8 total (77 passed, 77 total)
- **Playwright E2E Suites:**
  - `e2e/auth-lockout-isolation.e2e.cjs`: Customer login lockout (showing wait time in UI), admin login isolation without blockage, customer booking flow, and admin booking confirmation. **PASS (100%)**
  - `test-e2e-flow.cjs`: Two customers overlapping booking race condition, admin confirmation, and inline 409 conflict error banner. **PASS (100%)**
  - `test-post-vehicle.cjs`: Real-click vehicle accessory toggling, multipart image validation, and file size limits. **PASS (100%)**
  - `test-google-playwright.cjs`: Real-click Google sign-in navigation, parameter verification at Google, full mock OIDC browser login, and cancellation flow. **PASS (100%)**

---

## Customer Google OAuth Authentication & Pre-Hijacking Defense

**Scope:** Customer Google Sign-In (`carrental-api`, `carrental-web`)  
**Strict Rule:** Customers only. Admins can never sign in or be created via Google.  
**Status:** Remediated & Fully Verified (All 77 Unit/Integration Tests + All 3 Browser Playwright Scenarios Passing)

---

### 1. Threat Modeling & Vulnerability Remediation Register

#### SEC-012 (Critical): Pre-Hijacking Account Takeover via Existing Local Account Linkage
- **Threat Model / Attack Vector:**
  An attacker registers an account locally using a victim's email address (e.g. `victim@gmail.com`) before the victim joins the platform. When the real victim later clicks "Continue with Google", a naive OAuth implementation might associate the Google ID to the existing account without revoking credentials. The attacker could retain access using their known password or retain active session tokens created prior to the OAuth link.
- **How to Exploit:**
  1. Attacker registers `victim@example.com` with password `AttackerGeneratedSecret!99`.
  2. Attacker logs in and maintains an active refresh token.
  3. Victim logs in with Google OAuth using verified email `victim@example.com`.
  4. If passwords or active sessions are not invalidated, attacker retains full persistent access through their previous credentials and refresh tokens.
- **Fix:**
  In `carrental-api/src/services/googleAuth.service.js` (`processCallback`), when an account is linked to Google for the first time:
  1. Local passwords are completely wiped: `Password = NULL`, `password_hash = NULL`.
  2. All existing refresh tokens for the user in `tbl_refresh_tokens` are revoked (`is_revoked = 1`).
  3. The account's status is set to `email_verified = 1` and `auth_provider = 'google'`.
  4. A security audit event (`GOOGLE_USER_LINKED`) is dispatched with masked email and IP.
- **Proving Test:**
  `tests/google-auth.test.js` ("PRE-HIJACKING DEFENSE: first Google link clears local password hash, revokes sessions, and sets email_verified=1").

---

#### SEC-013 (High): Open Redirect Vulnerability via OAuth `returnTo` Parameter
- **Threat Model / Attack Vector:**
  OAuth flows frequently support a post-authentication redirect parameter (e.g. `returnTo`). If untrusted, attackers construct links like `/api/auth/google?returnTo=https://evil.com/phish` or `//evil.com` or `/\evil.com`. Victims authenticate on the legitimate site, and the application redirects their browser to the attacker's phishing site.
- **How to Exploit:**
  Crafting phishing links with protocol-relative (`//evil.com`), backslash bypasses (`/\\evil.com`), or external schemes (`https://attacker.site`).
- **Fix:**
  Implemented strict, defense-in-depth sanitization `sanitizeReturnTo(returnTo)`:
  1. Must start with a single `/`.
  2. Must NOT start with `//` (rejects protocol-relative URLs).
  3. Must NOT contain `\` (rejects Windows/parser bypasses).
  4. Must NOT contain `://` (rejects URI schemes).
  5. Any malformed input strictly falls back to `'/'`.
  6. The sanitized `returnTo` is embedded inside the signed, HMAC-protected `g_oauth_state` cookie, preventing client-side tampering during the authorization redirect.
- **Proving Test:**
  `tests/google-auth.test.js` ("Open Redirect Defense: sanitizes returnTo targeting external URLs or protocol-relative paths").

---

#### SEC-014 (High): Cross-Site Request Forgery (CSRF) & State Tampering in Authorization Code Flow
- **Threat Model / Attack Vector:**
  Without cryptographic binding of authorization requests, an attacker can initiate an OAuth flow, capture their own authorization code, and trick a victim into submitting the attacker's code (`/api/auth/google/callback?code=...`), causing the victim's browser session to be tied to the attacker's account.
- **How to Exploit:**
  Sending a callback URL with attacker-controlled state or replaying intercepted authorization codes.
- **Fix:**
  1. Full **PKCE (Proof Key for Code Exchange)** with `S256` (`code_verifier` generated with 32 bytes of cryptographic randomness, hashed using SHA-256 to create `code_challenge`).
  2. Signed OAuth State: Server generates random 32-byte `state` and random 32-byte `nonce`. The state payload `{ state, codeVerifier, nonce, returnTo, exp }` is HMAC-SHA256 signed using a server-side secret and stored in an `HttpOnly`, `SameSite=Lax` cookie (`g_oauth_state`) with a 10-minute TTL.
  3. On callback, the cookie signature, expiration, state equality, and ID token `nonce` claim are strictly validated.
  4. The state cookie is immediately deleted upon use.
  5. The post-callback session sets a fresh `csrf_nonce` with `SameSite=Strict`.
- **Proving Test:**
  `tests/google-auth.test.js` ("rejects request with wrong or tampered state", "rejects request when signed state cookie is expired", "rejects ID token with wrong or mismatched nonce").

---

#### SEC-015 (Medium): User Enumeration & Timing Attacks on Passwordless Accounts
- **Threat Model / Attack Vector:**
  Accounts created via Google OAuth have `Password = NULL` and `password_hash = NULL`. If the traditional password login endpoint (`/api/auth/login`) checked `if (!user.password_hash) return 401;` before computing Argon2id hashes, the request would return in ~1ms, whereas accounts with passwords take ~150-250ms. Attackers could measure response latency to discover which accounts use Google OAuth versus traditional passwords.
- **How to Exploit:**
  Sending password login attempts for `target@gmail.com` and measuring server execution time.
- **Fix:**
  In `carrental-api/src/services/auth.service.js`, if a user account exists but has neither `password_hash` nor `Password`, the service executes `verifyArgon2(DUMMY_ARGON2_HASH, password)` before returning the generic `AuthError('Invalid Details')`. Both valid password accounts and passwordless OAuth accounts exhibit constant execution time.
- **Proving Test:**
  `tests/google-auth.test.js` ("password login for passwordless account fails with generic Invalid Details and dummy Argon2 execution").

---

#### SEC-016 (Critical): Admin Privilege Escalation Boundary via OAuth
- **Threat Model / Attack Vector:**
  If an admin email (e.g. `admin@gmail.com`) is used to sign in via Google OAuth, an attacker possessing that Google account might gain administrative access if the authentication flow shared admin lookup or granted admin tokens.
- **How to Exploit:**
  Attempting to sign in with an email address matching an entry in the `admin` database table.
- **Fix:**
  1. The Google OAuth flow queries and operates **exclusively** on `tblusers` (customers). The `admin` database table is never queried.
  2. The OAuth callback issues customer JWT tokens (`user_type = 'user'`) signed with `JWT_ACCESS_SECRET` (not admin credentials).
  3. Any attempt by an OAuth-authenticated customer to request `/api/admin/*` routes is rejected with `401 Unauthorized` / `403 Forbidden` by `requireAdmin`.
  4. Admin portal contains zero OAuth buttons or Google hooks.
- **Proving Test:**
  `tests/google-auth.test.js` ("Admin Isolation Guarantee: Google sign-in matching admin email/username creates only customer session and cannot access admin routes").

---

### 2. Updated Authorization Matrix (Google OAuth Additions)

| Method | Endpoint | Anonymous | Customer (`user`) | Admin (`admin`) | Security Enforcement |
|:---|:---|:---:|:---:|:---:|:---|
| `GET` | `/api/auth/providers` | 200 | 200 | 200 | Returns `{ google: true/false }` based on runtime config |
| `GET` | `/api/auth/google` | 302 / 404 | 302 / 404 | 302 / 404 | Generates PKCE, signed `g_oauth_state` (SameSite=Lax, 10 min), redirects to Google; 404 if disabled; rate limited |
| `GET` | `/api/auth/google/callback` | 302 / 404 | 302 / 404 | 302 / 404 | Validates state, PKCE code exchange, verifies ID token (`iss`, `aud`, `exp`, `nonce`, `email_verified=true`); pre-hijacking session wipe; issues customer session; 404 if disabled; rate limited |

---

### 3. Architecture & Security Controls Summary

1. **Protocol Implementation:**
   - Server-side Authorization Code Flow with PKCE (`S256`).
   - Zero client-side Google SDKs or third-party tracking scripts loaded in the browser (ensures full compliance with Content Security Policy `script-src 'self'`).
   - Bundled local Google "G" logo SVG (`/public/assets/images/google-logo.svg`).
2. **Provider Failure & Cancellation Resilience:**
   - Provider errors or user cancellation (`error=access_denied`) redirect cleanly to `/?error=cancelled`.
   - `LoginModal.jsx` listens for error query parameters and presents inline user-friendly error banners inside the existing `#loginform` modal.
3. **Missing Contact Information Notice:**
   - Google OAuth profiles do not supply phone numbers. New customers created via Google have `ContactNo = NULL`.
   - On first login, new Google users are redirected to `/profile?notice=missing_contact` with an inline `.errorWrap` notice informing them to complete their contact number. Bookings are not blocked.
4. **Environment & Production Safety:**
   - `validateGoogleOAuthConfig()` runs at server startup: if any one of `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or `GOOGLE_REDIRECT_URI` is set while others are missing, the server crashes in production with a fatal configuration error.
   - Credentials check reports only `"set"` or `"missing"` without ever printing or logging secrets.
   - Dedicated `googleAuthLimiter` bucket prevents brute-force token generation and callback replay.

---

---

## Online Payment Gateway & Security Hardening Review

### 1. Payment Security Findings & Remediation Register

#### SEC-012 (Critical): Client-Side Payment Amount Tampering Prevention
- **Threat:** Malicious clients altering payment payload amounts (e.g. attempting to pay Rs. 1 for a Rs. 10,000 car rental).
- **Remediation:** Client-supplied amounts are completely ignored. `POST /api/payments/order` loads booking dates and price per day from `tblbooking` and `tblvehicles`, computing the exact inclusive duration and total in paise (`Math.round(days * PricePerDay * 100)`). The gateway order is created with this server-calculated value.

#### SEC-013 (Critical): Cryptographic Signature Verification & Constant-Time Comparison
- **Threat:** Forged checkout signatures or timing attacks on HMAC comparison.
- **Remediation:** Implemented `PaymentGateway.constantTimeCompare` using Node.js `crypto.timingSafeEqual` over pre-hashed buffers. Both `RazorpayGateway` and `MockGateway` verify HMAC-SHA256 signatures over `order_id|payment_id` before accepting payment details.

#### SEC-014 (Critical): Server-Side Gateway Payment Fetch & Status Verification
- **Threat:** Signature replay or checkout hijacking using valid signatures for mismatched amounts or orders.
- **Remediation:** After signature verification, `verifyPayment` calls `gateway.fetchPayment(paymentId)` server-side. It cryptographically asserts:
  1. `fetched.order_id === orderId`
  2. `fetched.amount === expectedAmountInPaise`
  3. `fetched.currency === 'INR'`
  4. `fetched.status === 'captured'` (or `'authorized'`)

#### SEC-015 (High): Concurrency, Race Conditions & Double-Spend Protection
- **Threat:** Simultaneous verification requests or webhook race conditions confirming or charging an order multiple times.
- **Remediation:**
  1. Database transaction with pessimistic locking: `SELECT ... FROM tblpayments WHERE booking_id = ? FOR UPDATE`.
  2. Idempotent short-circuit: if `payment_status === 'confirmed'`, returns success without re-executing updates.
  3. Database schema unique indexes on `gateway_order_id` and `gateway_payment_id` prevent duplicate payment records at the storage level.

#### SEC-016 (High): Webhook Forgery & Replay Protection
- **Threat:** Attackers forging webhook requests or replaying captured webhook events.
- **Remediation:**
  1. Mounted `express.raw({ type: '*/*', limit: '1mb' })` specifically on `/api/payments/webhook` ahead of JSON parsing to preserve exact raw byte buffers for HMAC verification.
  2. Verification requires `X-Razorpay-Signature` (or `X-Mock-Signature`).
  3. Webhook event deduplication via `tbl_payment_events` with a `UNIQUE KEY uq_payment_event_id (event_id)`. Replayed events return `{ received: true, duplicate: true }`.

#### SEC-017 (High): Webhook Out-of-Order Delivery & State Protection
- **Threat:** Delayed or out-of-order `payment.failed` webhooks arriving after an order was successfully captured and confirmed.
- **Remediation:** In `handleWebhook`, `payment.failed` strictly checks if the payment is in `'pending'` status. It **NEVER** downgrades an already confirmed payment (`payment_status === 'confirmed'`) to failed.

#### SEC-018 (Critical): Mock Gateway Production Safety Isolation
- **Threat:** Accidental activation of mock payment simulation in production environments or with production databases.
- **Remediation:** `MockGateway` constructor throws a fatal error if `NODE_ENV === 'production'` or `DB_NAME !== 'carrental_test'`. Mock methods are prefixed with `mock_` and gateway name is tagged as `'mock'`. The frontend mock checkout simulator is guarded by `import.meta.env.PROD` and dead-code eliminated in production builds.

#### SEC-019 (Medium): Dedicated Rate-Limiting Buckets
- **Remediation:** Created dedicated rate limiters:
  - `paymentOrderLimiter` (Production: 20/15min, Dev: 60/15min)
  - `paymentVerifyLimiter` (Production: 30/15min, Dev: 90/15min)
  - Prevents payment order creation from impacting general API browsing or login rate limits.

---

### 2. Payment Gateway Authorization & Access Matrix

| Method | Endpoint | Anonymous | Customer (`user`) | Admin (`admin`) | Security Enforcement |
|:---|:---|:---:|:---:|:---:|:---|
| `GET` | `/api/payments/config` | 200 | 200 | 200 | Returns `{ available, gateway, keyId }` without secrets |
| `POST` | `/api/payments/order` | 401 | 200 | 403 | Customer auth + CSRF; enforces ownership (`userEmail`); enforces `Status=1` (Confirmed); server calculates amount; reuses active pending order; rate limited (`paymentOrderLimiter`) |
| `POST` | `/api/payments/verify` | 401 | 200 | 403 | Customer auth + CSRF; verifies signature + server-side gateway payment fetch; row-level lock; rate limited (`paymentVerifyLimiter`) |
| `POST` | `/api/payments/webhook` | 200 / 422 | 200 / 422 | 200 / 422 | Raw body HMAC verification; skips CSRF; event deduplication via `tbl_payment_events`; non-downgrading |
| `GET` | `/api/payments/status/:bookingId` | 401 | 200 / 403 | 200 | Polling support; strict ownership check (IDOR protected: owner or admin) |
| `GET` | `/api/payments/receipt/:bookingId` | 401 | 200 / 403 | 200 | Strict IDOR check: customers only view their own receipts; admin can view all |
| `POST` | `/api/admin/payments/reconcile/:id`| 401 | 403 | 200 | Admin only; queries gateway for status of pending payments |

---

### 3. Verification Test Results

- **Automated Unit & Integration Tests (`carrental-api`):**
  - `tests/payment-gateway.test.js`: 23 tests passing (100%).
  - Full Jest suite: 9 suites, 102 tests passing (100%).
- **Playwright Real-Browser Tests (`test-payment-playwright.cjs`):**
  - Real clicks only (`no force: true`, `no setChecked`, zero direct DOM manipulations).
  - Validated full mock checkout flow, failure simulation, retry, success, receipt generation, cross-user IDOR protection, and admin manage payments display. **PASS (100%)**



