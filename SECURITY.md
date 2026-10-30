# Security Policy

## Supported Versions

Only the current modern release branch (`main`) receives active security updates and patches.

| Version | Supported          |
| ------- | ------------------ |
| 2.x (Modernized React + Node/Express Stack) | :white_check_mark: |
| 1.x (Legacy Core PHP)                       | :x: (Deprecated)   |

---

## Reporting a Vulnerability

We take the security of WandarWheels Car Rental System seriously. If you identify a security vulnerability, please do NOT create a public GitHub issue.

Instead, please report the vulnerability privately via:
- **Email:** `security@wandarwheels.com` (or contact project maintainer: `rohit2024tens@gmail.com`)
- Include:
  - Description of the vulnerability and attack vector.
  - Proof-of-concept steps or payload.
  - Potential impact and affected endpoints.

### Responsible Disclosure Process
1. **Acknowledgement:** We will acknowledge receipt of your report within 48 hours.
2. **Investigation & Remediation:** We will investigate and produce a patch in a private branch.
3. **Release:** Once verified, a security advisory and patched release will be published.

---

## Hardening Standards Implemented

- **Password Hashing:** Argon2id with OWASP-recommended parameters (64 MiB, 3 iterations, 4 parallelism). Legacy MD5 hashes are automatically upgraded on first login and cleared.
- **Authentication & Sessions:** httpOnly, SameSite, Secure cookies with cryptographic signed double-submit CSRF protection on all state-mutating HTTP methods.
- **Refresh Token Rotation:** Token family rotation with automated reuse detection that invalidates all compromised sessions immediately upon reuse.
- **Access Control:** Strict Role-Based Access Control (RBAC) and object ownership verification on all bookings, receipts, profile, and administrative endpoints.
- **Input Validation:** Strict type, length, and format enforcement using Zod and prepared statements for all SQL queries.
- **File Upload Protection:** Strict extension allowlist, magic-byte binary header inspection, 5MB file size limits, random UUID filenames, and static serving with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'`.
