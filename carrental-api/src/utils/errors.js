'use strict';
/**
 * Custom application error classes.
 * Controllers throw these; the global error handler maps them to HTTP responses.
 */

class AppError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 422);
    this.details = details;
  }
}

class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(resourceOrMessage = 'Resource') {
    const isFullMessage =
      resourceOrMessage.endsWith('not found') ||
      resourceOrMessage.includes('not configured') ||
      resourceOrMessage.includes('is not');
    const message = isFullMessage ? resourceOrMessage : `${resourceOrMessage} not found`;
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message, details) {
    super(message, 409);
    this.details = details;
  }
}

class LockoutError extends AppError {
  constructor(message = 'Too many attempts. Please try again later.', retryAfter = 60) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Online payments are currently unavailable') {
    super(message, 503);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  LockoutError,
  ServiceUnavailableError,
};
