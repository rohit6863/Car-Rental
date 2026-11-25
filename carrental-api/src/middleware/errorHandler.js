'use strict';
const { AppError, ValidationError } = require('../utils/errors');

/**
 * Sensitive key pattern: case-insensitive keys containing
 * pass, token, secret, signature, authorization, cookie, card, cvv, otp, key
 */
const SENSITIVE_KEY_PATTERN = /(pass|token|secret|signature|authorization|cookie|card|cvv|otp|key)/i;

/**
 * Recursively redact sensitive fields from request payloads before logging.
 * Never logs Buffer/raw bodies in clear text (logs only length and content type).
 */
function sanitizeRequestBody(body, req = null, seen = new WeakSet()) {
  if (body == null) return body;

  // Handle Buffer or raw binary bodies
  if (Buffer.isBuffer(body)) {
    return {
      type: 'Buffer',
      length: body.length,
      contentType: req?.headers?.['content-type'] || 'application/octet-stream',
    };
  }

  // Primitives
  if (typeof body !== 'object') return body;

  // Cycle detection
  if (seen.has(body)) {
    return '[Circular]';
  }
  seen.add(body);

  // Arrays
  if (Array.isArray(body)) {
    return body.map((item) => sanitizeRequestBody(item, req, seen));
  }

  // Objects
  const sanitized = {};
  for (const [key, val] of Object.entries(body)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '***REDACTED***';
    } else if (Buffer.isBuffer(val)) {
      sanitized[key] = {
        type: 'Buffer',
        length: val.length,
      };
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeRequestBody(val, req, seen);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Global error handler.
 * Maps AppError subclasses to structured JSON responses.
 * Never leaks stack traces, internal SQL statements, or secrets to the client.
 */
function errorHandler(err, req, res, _next) {
  // Always clean up any uploaded files on disk if the request encountered an error
  if (req.file || req.files) {
    try {
      const { cleanupUploadedFiles } = require('../utils/upload');
      cleanupUploadedFiles(req);
    } catch {}
  }

  // Determine status code for error logging and response
  let statusCode = 500;
  if (err instanceof ValidationError || err.name === 'MulterError') {
    statusCode = 422;
  } else if (err instanceof AppError && err.statusCode) {
    statusCode = err.statusCode;
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
  } else if (err.message && err.message.startsWith('CORS:')) {
    statusCode = 403;
  } else if (typeof err.statusCode === 'number') {
    statusCode = err.statusCode;
  } else if (typeof err.status === 'number') {
    statusCode = err.status;
  }

  // Log full stacks only for 5xx errors and a single line for 4xx
  const method = req?.method || 'UNKNOWN';
  const path = req?.originalUrl || req?.path || '/';
  if (statusCode >= 500) {
    const safeBody = sanitizeRequestBody(req?.body, req);
    console.error(`[${new Date().toISOString()}] ${method} ${path} ${statusCode} - ${err.name}: ${err.message}`, {
      code: err.code,
      body: safeBody,
      stack: err.stack,
    });
  } else {
    console.warn(`[${new Date().toISOString()}] ${method} ${path} ${statusCode} - ${err.name}: ${err.message}`);
  }

  // Multer errors (e.g. file size limit exceeded)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({
        error: 'File too large. Maximum allowed size is 5 MB per image.',
        details: [{ field: err.field || 'file', message: 'File too large. Maximum allowed size is 5 MB per image.' }],
      });
    }
    return res.status(422).json({
      error: err.message || 'File upload error',
      details: [{ field: err.field || 'file', message: err.message || 'File upload error' }],
    });
  }

  // Known application validation error
  if (err instanceof ValidationError) {
    return res.status(422).json({
      error: err.message || 'Validation failed',
      ...(err.details && { details: err.details }),
    });
  }

  // Known application errors (AuthError, ForbiddenError, NotFoundError, ConflictError, LockoutError)
  if (err instanceof AppError) {
    if (err.retryAfter) {
      res.setHeader('Retry-After', String(err.retryAfter));
    }
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.retryAfter && { retryAfter: err.retryAfter }),
      ...(err.details && { details: err.details }),
    });
  }

  // MySQL2 duplicate entry constraint error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  // CORS error
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: 'CORS policy violation' });
  }

  // Generic 500 – strictly no stack traces or SQL details in client responses
  res.status(500).json({
    error: 'An internal server error occurred.',
  });
}

module.exports = { errorHandler, sanitizeRequestBody, SENSITIVE_KEY_PATTERN };
