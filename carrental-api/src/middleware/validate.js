'use strict';
const { ValidationError } = require('../utils/errors');

/**
 * Zod validation middleware factory.
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
          const details = result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }));
          return next(new ValidationError('Validation failed', details));
        }
        req.body = result.data;
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          const details = result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }));
          return next(new ValidationError('Query validation failed', details));
        }
        req.query = result.data;
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          const details = result.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          }));
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
