'use strict';
const { ValidationError } = require('../utils/errors');

const LEGACY_ALIASES = ['current_password', 'currentPassword', 'new_password', 'newPassword', 'confirm_password', 'confirmPassword'];

function checkAliases(req) {
  if (req.body && typeof req.body === 'object') {
    for (const alias of LEGACY_ALIASES) {
      if (alias in req.body) {
        console.warn(`[DEPRECATION WARNING] Legacy password field alias "${alias}" used on route ${req.originalUrl || req.url}`);
      }
    }
  }
}

function formatHumanMessage(issue) {
  let msg = issue.message;
  if (!msg || msg.includes('expected string, received undefined') || msg === 'Required' || msg.includes('Invalid input: expected string')) {
    const field = Array.isArray(issue.path) ? issue.path[issue.path.length - 1] : String(issue.path || '');
    if (field === 'password') msg = 'Current password is required';
    else if (field === 'newpassword') msg = 'New password is required';
    else if (field === 'confirmpassword') msg = 'Confirm password is required';
    else if (field === 'token') msg = 'Token is required';
    else if (field === 'email' || field === 'emailid') msg = 'Email is required';
    else if (field === 'username') msg = 'Username is required';
    else msg = `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Field'} is required`;
  }
  return msg;
}

function extractDetails(error) {
  const issues = error?.issues || error?.errors || [];
  return issues.map((e) => ({
    field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
    message: formatHumanMessage(e),
  }));
}

/**
 * Zod validation middleware factory (compatible with Zod 3 & Zod 4).
 * Usage: router.post('/path', validate({ body: MySchema }), controller)
 *
 * @param {{ body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }} schemas
 */
function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        checkAliases(req);
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          const details = extractDetails(result.error);
          return next(new ValidationError('Validation failed', details));
        }
        req.body = result.data;
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          const details = extractDetails(result.error);
          return next(new ValidationError('Query validation failed', details));
        }
        req.query = result.data;
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          const details = extractDetails(result.error);
          return next(new ValidationError('Param validation failed', details));
        }
        req.params = result.data;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validate };
