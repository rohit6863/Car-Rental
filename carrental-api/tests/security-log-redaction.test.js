'use strict';

const { sanitizeRequestBody, SENSITIVE_KEY_PATTERN, errorHandler } = require('../src/middleware/errorHandler');
const { NotFoundError, AppError, ValidationError } = require('../src/utils/errors');
const authService = require('../src/services/auth.service');

describe('Security Log Redaction & Safe Error Handling', () => {
  describe('SENSITIVE_KEY_PATTERN', () => {
    const sensitiveKeys = [
      'pass',
      'password',
      'current_password',
      'new_password',
      'confirmpassword',
      'token',
      'access_token',
      'refreshToken',
      'secret',
      'jwt_secret',
      'signature',
      'webhook_signature',
      'authorization',
      'cookie',
      'session_cookie',
      'card',
      'credit_card_number',
      'cvv',
      'card_cvv',
      'otp',
      'sms_otp',
      'key',
      'apiKey',
      'private_key',
    ];

    sensitiveKeys.forEach((key) => {
      it(`matches sensitive key alias "${key}" case-insensitively`, () => {
        expect(SENSITIVE_KEY_PATTERN.test(key)).toBe(true);
        expect(SENSITIVE_KEY_PATTERN.test(key.toUpperCase())).toBe(true);
      });
    });

    it('does not match non-sensitive keys', () => {
      expect(SENSITIVE_KEY_PATTERN.test('username')).toBe(false);
      expect(SENSITIVE_KEY_PATTERN.test('email')).toBe(false);
      expect(SENSITIVE_KEY_PATTERN.test('fullName')).toBe(false);
      expect(SENSITIVE_KEY_PATTERN.test('address')).toBe(false);
    });
  });

  describe('sanitizeRequestBody recursive redaction', () => {
    it('redacts top-level current_password and new_password fields', () => {
      const body = {
        email: 'user@example.com',
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      };
      const sanitized = sanitizeRequestBody(body);
      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.current_password).toBe('***REDACTED***');
      expect(sanitized.new_password).toBe('***REDACTED***');
    });

    it('redacts deeply nested sensitive keys recursively', () => {
      const nested = {
        metadata: {
          request_id: 'req_123',
          auth: {
            user_token: 'secret_token_abc',
            credentials: {
              new_password: 'DeepSecretPassword!',
              api_key: 'key_12345',
            },
          },
        },
        payload: {
          payment: {
            credit_card: '4111111111111111',
            card_cvv: '123',
            otp_code: '987654',
          },
        },
      };

      const result = sanitizeRequestBody(nested);
      expect(result.metadata.request_id).toBe('req_123');
      expect(result.metadata.auth.user_token).toBe('***REDACTED***');
      expect(result.metadata.auth.credentials.new_password).toBe('***REDACTED***');
      expect(result.metadata.auth.credentials.api_key).toBe('***REDACTED***');
      expect(result.payload.payment.credit_card).toBe('***REDACTED***');
      expect(result.payload.payment.card_cvv).toBe('***REDACTED***');
      expect(result.payload.payment.otp_code).toBe('***REDACTED***');
    });

    it('redacts sensitive keys inside arrays of objects', () => {
      const body = {
        users: [
          { name: 'Alice', token: 'token_a' },
          { name: 'Bob', current_password: 'secret_b' },
        ],
      };
      const result = sanitizeRequestBody(body);
      expect(result.users[0].name).toBe('Alice');
      expect(result.users[0].token).toBe('***REDACTED***');
      expect(result.users[1].name).toBe('Bob');
      expect(result.users[1].current_password).toBe('***REDACTED***');
    });

    it('never logs Buffer/raw binary bodies in clear text (logs length and contentType only)', () => {
      const rawBuffer = Buffer.from('RAW_BINARY_BODY_DATA_THAT_MIGHT_CONTAIN_SECRETS');
      const req = { headers: { 'content-type': 'application/octet-stream' } };
      const result = sanitizeRequestBody(rawBuffer, req);

      expect(typeof result).toBe('object');
      expect(result.type).toBe('Buffer');
      expect(result.length).toBe(rawBuffer.length);
      expect(result.contentType).toBe('application/octet-stream');
      expect(JSON.stringify(result)).not.toContain('RAW_BINARY_BODY_DATA');
    });

    it('handles nested Buffer properties safely', () => {
      const body = {
        filename: 'document.pdf',
        data: Buffer.from('BINARY_CONTENT'),
      };
      const result = sanitizeRequestBody(body);
      expect(result.filename).toBe('document.pdf');
      expect(result.data).toEqual({ type: 'Buffer', length: 14 });
    });

    it('gracefully handles circular object references without crashing', () => {
      const circular = { name: 'cycle' };
      circular.self = circular;
      const result = sanitizeRequestBody(circular);
      expect(result.name).toBe('cycle');
      expect(result.self).toBe('[Circular]');
    });

    it('returns primitives and null/undefined as-is', () => {
      expect(sanitizeRequestBody(null)).toBe(null);
      expect(sanitizeRequestBody(undefined)).toBe(undefined);
      expect(sanitizeRequestBody('hello')).toBe('hello');
      expect(sanitizeRequestBody(123)).toBe(123);
    });
  });

  describe('errorHandler logging rules (single-line 4xx, full-stack 5xx)', () => {
    let warnSpy;
    let errorSpy;

    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('logs a single line with no stack trace for 4xx errors', () => {
      const err = new ValidationError('Invalid input data', [{ field: 'current_password', message: 'Wrong password' }]);
      const req = { method: 'POST', path: '/api/auth/update-password', body: { current_password: 'secret' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      errorHandler(err, req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(422);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const warnCall = warnSpy.mock.calls[0][0];
      // Must be a single line (no newline characters)
      expect(warnCall).not.toContain('\n');
      expect(warnCall).toContain('POST /api/auth/update-password 422 - ValidationError: Invalid input data');
      // console.error must NOT be called for 4xx
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('logs full stack and sanitized body for 5xx errors', () => {
      const err = new Error('Database connection failed');
      err.stack = 'Error: Database connection failed\n    at query (pool.js:10:1)';
      const req = {
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'user@example.com', password: 'ClearTextPassword!' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      errorHandler(err, req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(500);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [msg, details] = errorSpy.mock.calls[0];
      expect(msg).toContain('POST /api/auth/login 500');
      expect(details.stack).toBeDefined();
      expect(details.stack).toContain('pool.js');
      expect(details.body.password).toBe('***REDACTED***');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Password reset console token printing in production', () => {
    it('never prints [PASSWORD RESET CONSOLE] token when NODE_ENV is production', async () => {
      const { pool } = require('../src/db/pool');
      const executeSpy = jest.spyOn(pool, 'execute').mockImplementation(async (sql) => {
        if (sql.includes('SELECT id, FullName, EmailId FROM tblusers')) {
          return [[{ id: 1, FullName: 'Test User', EmailId: 'user@example.com' }], []];
        }
        if (sql.includes('INSERT INTO tbl_password_resets')) {
          return [{ insertId: 1 }, []];
        }
        return [[], []];
      });

      const mailService = require('../src/services/mail.service');
      const mailSpy = jest.spyOn(mailService, 'sendPasswordResetEmail').mockResolvedValue(true);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const prevEnv = process.env.NODE_ENV;
      try {
        // 1. In production: MUST NOT print token
        process.env.NODE_ENV = 'production';
        await authService.forgotPassword('user@example.com');

        const prodCalls = consoleLogSpy.mock.calls.map((c) => c.join(' '));
        const leakedTokenLog = prodCalls.some((log) => log.includes('[PASSWORD RESET CONSOLE]'));
        expect(leakedTokenLog).toBe(false);

        // 2. In development: verify it prints for debugging
        process.env.NODE_ENV = 'development';
        await authService.forgotPassword('user@example.com');

        const devCalls = consoleLogSpy.mock.calls.map((c) => c.join(' '));
        const devTokenLog = devCalls.some((log) => log.includes('[PASSWORD RESET CONSOLE]'));
        expect(devTokenLog).toBe(true);
      } finally {
        process.env.NODE_ENV = prevEnv;
        executeSpy.mockRestore();
        mailSpy.mockRestore();
        consoleLogSpy.mockRestore();
      }
    });
  });

  describe('NotFoundError message formatting', () => {
    it('formats "Google authentication is not configured" without duplicate "not found"', () => {
      const err = new NotFoundError('Google authentication is not configured');
      expect(err.message).toBe('Google authentication is not configured');
      expect(err.message).not.toContain('not found');
      expect(err.statusCode).toBe(404);
    });

    it('formats "Google sign-in is not configured" without duplicate "not found"', () => {
      const err = new NotFoundError('Google sign-in is not configured');
      expect(err.message).toBe('Google sign-in is not configured');
      expect(err.statusCode).toBe(404);
    });

    it('formats resource names correctly with "not found"', () => {
      const err = new NotFoundError('Vehicle');
      expect(err.message).toBe('Vehicle not found');
      expect(err.statusCode).toBe(404);
    });

    it('preserves messages that already include "not found"', () => {
      const err = new NotFoundError('User not found');
      expect(err.message).toBe('User not found');
      expect(err.statusCode).toBe(404);
    });
  });
});
