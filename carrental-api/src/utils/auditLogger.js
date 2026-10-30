'use strict';

/**
 * Mask an email for privacy/GDPR in logs: user@example.com -> u***@example.com
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'anonymous';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const maskedName = name.length <= 2 ? `${name[0]}***` : `${name.slice(0, 2)}***${name.slice(-1)}`;
  return `${maskedName}@${parts[1]}`;
}

/**
 * Audit log for security-critical actions.
 * @param {string} event - e.g. 'ADMIN_LOGIN_SUCCESS', 'CUSTOMER_LOGIN_FAILED', 'BOOKING_CONFIRMED'
 * @param {{ actorType?: 'user'|'admin'|'anonymous'|'system', actorId?: string|number, ip?: string, details?: object }} data
 */
function auditLog(event, data = {}) {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = { ...data.details };

  // Remove any sensitive properties if present
  delete sanitizedDetails.password;
  delete sanitizedDetails.newpassword;
  delete sanitizedDetails.token;
  delete sanitizedDetails.refreshToken;
  delete sanitizedDetails.accessToken;

  if (sanitizedDetails.email) {
    sanitizedDetails.email = maskEmail(sanitizedDetails.email);
  }

  const logEntry = {
    timestamp,
    category: 'SECURITY_AUDIT',
    event,
    actorType: data.actorType || 'anonymous',
    actorId: data.actorId || null,
    ip: data.ip || '0.0.0.0',
    details: sanitizedDetails,
  };

  console.log(`[SECURITY AUDIT] ${JSON.stringify(logEntry)}`);
}

module.exports = { auditLog, maskEmail };
