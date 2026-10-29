'use strict';
const { AppError, ValidationError } = require('../utils/errors');

/**
 * Global error handler.
 * Maps AppError subclasses to structured JSON responses.
 * Never leaks stack traces or DB details to the client.
 */
function errorHandler(err, req, res, _next) {
  // Log full error internally (never expose to client)
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev || !(err instanceof AppError)) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  // Known application errors
  if (err instanceof ValidationError) {
    return res.status(422).json({
      error: err.message,
      details: err.details,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // mysql2 duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  // CORS error from cors package
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: 'CORS policy violation' });
  }

  // Unhandled – generic 500 (never expose internals)
  res.status(500).json({
    error: 'An internal server error occurred.',
    ...(isDev && { _detail: err.message, _stack: err.stack }),
  });
}

module.exports = { errorHandler };
