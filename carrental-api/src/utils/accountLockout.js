'use strict';
const { query } = require('../db/pool');
const { LockoutError } = require('./errors');

const isProd = process.env.NODE_ENV === 'production';

// Strict production defaults, relaxed in development, never off!
const CUSTOMER_THRESHOLD = parseInt(process.env.LOCKOUT_CUSTOMER_THRESHOLD || (isProd ? '5' : '10'), 10);
const ADMIN_THRESHOLD    = parseInt(process.env.LOCKOUT_ADMIN_THRESHOLD    || (isProd ? '3' : '6'), 10);

/**
 * Calculates progressive delay duration in seconds based on attempt count and role.
 */
function getProgressiveDelaySeconds(attempts, isAdmin = false) {
  const threshold = isAdmin ? ADMIN_THRESHOLD : CUSTOMER_THRESHOLD;
  if (attempts >= threshold + 2) return 900; // Tier 3: 15 minutes
  if (attempts >= threshold + 1) return 300; // Tier 2: 5 minutes
  if (attempts >= threshold)     return 60;  // Tier 1: 1 minute
  return 0;
}

/**
 * Check if an account + IP pair is currently locked out.
 * Keyed strictly on (identifier + IP) so a stranger cannot lock out a customer or admin from another IP.
 *
 * @param {string} identifier - email or username
 * @param {string} ip - client IP address
 * @param {boolean} isAdmin - whether this is an admin login check
 */
async function checkAccountLockout(identifier, ip, isAdmin = false) {
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_LOCKOUT) {
    return; // allow test suite to test without lockouts unless explicitly enabled
  }

  const clientIp = ip || '0.0.0.0';
  const threshold = isAdmin ? ADMIN_THRESHOLD : CUSTOMER_THRESHOLD;

  // Retrieve recent failed attempts for this exact (identifier, IP) pair in the past 15 minutes
  // Using TIMESTAMPDIFF(SECOND, attempt_time, NOW()) guarantees exact database-clock elapsed time without timezone skew
  const [rows] = await query(`
    SELECT TIMESTAMPDIFF(SECOND, attempt_time, NOW()) AS elapsed_sec
    FROM tbl_login_attempts
    WHERE identifier = ? AND ip_address = ?
      AND attempt_time > NOW() - INTERVAL 15 MINUTE
    ORDER BY attempt_time DESC
  `, [identifier, clientIp]);

  if (rows && rows.length >= threshold) {
    const elapsedSec = Math.max(0, parseInt(rows[0].elapsed_sec, 10) || 0);
    const requiredSec = getProgressiveDelaySeconds(rows.length, isAdmin);

    if (elapsedSec < requiredSec) {
      const remainingSec = Math.max(1, requiredSec - elapsedSec);
      const minutes = Math.max(1, Math.ceil(remainingSec / 60));
      throw new LockoutError(
        `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
        remainingSec
      );
    }
  }
}

/**
 * Record a failed login attempt for an (identifier, IP) pair.
 */
async function recordFailedAttempt(identifier, ip) {
  const clientIp = ip || '0.0.0.0';
  await query(`
    INSERT INTO tbl_login_attempts (identifier, ip_address, attempt_time)
    VALUES (?, ?, NOW())
  `, [identifier, clientIp]);
}

/**
 * Clear failed attempts for this identifier (optionally per IP or all IPs).
 */
async function clearFailedAttempts(identifier, ip) {
  if (ip) {
    await query('DELETE FROM tbl_login_attempts WHERE identifier = ? AND ip_address = ?', [identifier, ip]);
  } else {
    await query('DELETE FROM tbl_login_attempts WHERE identifier = ?', [identifier]);
  }
}

module.exports = {
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  getProgressiveDelaySeconds,
  CONFIG: {
    CUSTOMER_THRESHOLD,
    ADMIN_THRESHOLD,
  },
};
