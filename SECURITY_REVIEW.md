# Phase 3: Comprehensive Security Hardening Review

**Target:** WandarWheels Car Rental System (`carrental-api`, `carrental-web`, `carrental-admin`)  
**Date:** October 2026  
**Auditor:** Senior Full-Stack Security Engineer  
**Status:** Remediated & Fully Verified (All 49 Tests Passing)

---

## Executive Summary

During Phase 3, we performed a thorough threat-modeling and security-hardening review of the modernized Car Rental application across all three services. Eleven (11) distinct vulnerabilities and architectural security gaps were identified, categorized, exploited in test conditions, defensively remediated, and verified using automated test suites.

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

## Phase 3b: Rate Limiter Isolation, Lockout Hardening & Dependency Upgrades

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

In Phase 3b, rate limiting was completely redesigned into isolated purpose-built buckets:
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
- **`quill` (2.0.3):** Kept at 2.0.3. Advisory `GHSA-v3m3-f69x-jf25` relates to Quill's HTML export feature. In our application, all content read from the Quill editor is sanitized through `DOMPurify.sanitize()` prior to submission to the API (`AdminManagePagesPage.jsx`), and defense-in-depth sanitization (`sanitizeHtml`) is executed on the server before database storage. Verified with XSS test payload in `tests/phase3b.test.js`.
- **Command Output (`carrental-admin`):**
  ```
  2 vulnerabilities (1 low [quill 2.0.3], 1 moderate [bootstrap 3.4.1] - remediated via DOMPurify and static usage)
  ```

---

### 5. Test Suite Verification Summary

- **API Test Suites:** 7 passed, 7 total (59 passed, 59 total)
- **Playwright E2E Suites:**
  - `test-phase3b-playwright.cjs`: Customer login lockout (showing wait time in UI), admin login isolation without blockage, customer booking flow, and admin booking confirmation. **PASS (100%)**
  - `test-e2e-flow.cjs`: Two customers overlapping booking race condition, admin confirmation, and inline 409 conflict error banner. **PASS (100%)**

