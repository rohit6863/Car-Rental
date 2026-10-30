'use strict';
const { AppError, ValidationError } = require('../utils/errors');

/**
 * Redact sensitive fields from request payloads before logging.
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'newpassword', 'confirmpassword', 'token', 'refreshToken', 'accessToken', 'card_number', 'cvv'];
  for (const key of sensitiveKeys) {
    if (key in sanitized) sanitized[key] = '***REDACTED***';
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

  // Safe internal logging with sensitive parameter redaction
  const safeBody = sanitizeRequestBody(req.body);
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    name: err.name,
    message: err.message,
    code: err.code,
    body: safeBody,
  });

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

module.exports = { errorHandler };
