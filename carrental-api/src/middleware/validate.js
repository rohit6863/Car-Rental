'use strict';
const { ValidationError } = require('../utils/errors');

function extractDetails(error) {
  const issues = error?.issues || error?.errors || [];
  return issues.map((e) => ({
    field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
    message: e.message,
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
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          return next(new ValidationError('Validation failed', extractDetails(result.error)));
        }
        req.body = result.data;
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          return next(new ValidationError('Query validation failed', extractDetails(result.error)));
        }
        req.query = result.data;
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          return next(new ValidationError('Param validation failed', extractDetails(result.error)));
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
