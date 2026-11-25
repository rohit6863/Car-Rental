'use strict';

const {
  REQUIRED_DATABASES,
  validateDatabaseName,
  updateEnvContent,
} = require('../scripts/provision-dev-databases.cjs');

describe('Database Provisioning Pure Unit Tests (Zero MySQL Dependency)', () => {
  describe('REQUIRED_DATABASES constant', () => {
    it('defines exactly the three required isolated test databases', () => {
      expect(REQUIRED_DATABASES).toEqual([
        'wanderwheels_demo_test',
        'wanderwheels_jest_test',
        'wanderwheels_e2e_test',
      ]);
    });

    it('all required databases pass strict validation', () => {
      REQUIRED_DATABASES.forEach((db) => {
        expect(() => validateDatabaseName(db)).not.toThrow();
        expect(validateDatabaseName(db)).toBe(db);
      });
    });
  });

  describe('validateDatabaseName', () => {
    it('accepts compliant names ending in _test', () => {
      expect(validateDatabaseName('wanderwheels_demo_test')).toBe('wanderwheels_demo_test');
      expect(validateDatabaseName('wanderwheels_jest_test')).toBe('wanderwheels_jest_test');
      expect(validateDatabaseName('wanderwheels_e2e_test')).toBe('wanderwheels_e2e_test');
      expect(validateDatabaseName('custom_service_test')).toBe('custom_service_test');
    });

    it('refuses the legacy database name "carrental" case-insensitively', () => {
      expect(() => validateDatabaseName('carrental')).toThrow(/Refusing to touch legacy database "carrental"/i);
      expect(() => validateDatabaseName('CARRENTAL')).toThrow(/Refusing to touch legacy database "carrental"/i);
      expect(() => validateDatabaseName('  carrental  ')).toThrow(/Refusing to touch legacy database "carrental"/i);
    });

    it('refuses database names that do not end with _test', () => {
      expect(() => validateDatabaseName('wanderwheels')).toThrow(/must end with "_test"/);
      expect(() => validateDatabaseName('wanderwheels_prod')).toThrow(/must end with "_test"/);
      expect(() => validateDatabaseName('wanderwheels_dev')).toThrow(/must end with "_test"/);
      expect(() => validateDatabaseName('test_database')).toThrow(/must end with "_test"/);
    });

    it('refuses empty, non-string, or invalid character database names', () => {
      expect(() => validateDatabaseName('')).toThrow(/non-empty string/);
      expect(() => validateDatabaseName(null)).toThrow(/non-empty string/);
      expect(() => validateDatabaseName(undefined)).toThrow(/non-empty string/);
      expect(() => validateDatabaseName('db-with-hyphens_test')).toThrow(/invalid characters/);
      expect(() => validateDatabaseName('db.with.dots_test')).toThrow(/invalid characters/);
      expect(() => validateDatabaseName('db;injection_test')).toThrow(/invalid characters/);
    });
  });

  describe('updateEnvContent', () => {
    it('replaces existing target keys and preserves comments, whitespace, and other keys', () => {
      const initialEnv = [
        '# Server Configuration',
        'PORT=4000',
        'NODE_ENV=development',
        '',
        '# Database Credentials',
        'DB_HOST=localhost',
        'DB_USER=root',
        'DB_PASS=old_password',
        'DB_NAME=old_database',
        '',
        '# Secrets',
        'JWT_ACCESS_SECRET=super_secret_access_token_jwt',
      ].join('\n');

      const updates = {
        DB_USER: 'ww_dev',
        DB_PASS: 'a1b2c3d4e5f60718293a4b5c',
        DB_NAME: 'wanderwheels_demo_test',
        TEST_DB_NAME: 'wanderwheels_jest_test',
        E2E_DB_NAME: 'wanderwheels_e2e_test',
      };

      const result = updateEnvContent(initialEnv, updates);

      // Verify replaced keys
      expect(result).toContain('DB_USER=ww_dev');
      expect(result).not.toContain('DB_USER=root');
      expect(result).toContain('DB_PASS=a1b2c3d4e5f60718293a4b5c');
      expect(result).not.toContain('DB_PASS=old_password');
      expect(result).toContain('DB_NAME=wanderwheels_demo_test');
      expect(result).not.toContain('DB_NAME=old_database');

      // Verify appended keys
      expect(result).toContain('TEST_DB_NAME=wanderwheels_jest_test');
      expect(result).toContain('E2E_DB_NAME=wanderwheels_e2e_test');

      // Verify preserved keys and comments
      expect(result).toContain('# Server Configuration');
      expect(result).toContain('PORT=4000');
      expect(result).toContain('NODE_ENV=development');
      expect(result).toContain('DB_HOST=localhost');
      expect(result).toContain('JWT_ACCESS_SECRET=super_secret_access_token_jwt');
    });

    it('creates all keys from an empty string', () => {
      const updates = {
        DB_USER: 'ww_dev',
        DB_PASS: 'random_hex_password',
        DB_NAME: 'wanderwheels_demo_test',
        TEST_DB_NAME: 'wanderwheels_jest_test',
        E2E_DB_NAME: 'wanderwheels_e2e_test',
      };

      const result = updateEnvContent('', updates);
      expect(result).toBe(
        'DB_USER=ww_dev\nDB_PASS=random_hex_password\nDB_NAME=wanderwheels_demo_test\nTEST_DB_NAME=wanderwheels_jest_test\nE2E_DB_NAME=wanderwheels_e2e_test\n'
      );
    });

    it('is idempotent when re-run with the same updates', () => {
      const initial = 'DB_USER=ww_dev\nDB_PASS=secret123\n';
      const updates = { DB_USER: 'ww_dev', DB_PASS: 'secret123' };
      const once = updateEnvContent(initial, updates);
      const twice = updateEnvContent(once, updates);
      expect(twice).toBe(once);
    });
  });
});
