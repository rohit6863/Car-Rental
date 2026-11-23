'use strict';

const { assertSafeTestDatabase } = require('../src/db/dbGuard');

describe('Database Isolation and Safety Guards', () => {
  it('explicitly refuses legacy database "carrental" with unmistakable error', () => {
    expect(() => assertSafeTestDatabase('carrental')).toThrow(
      /Refusing to connect to legacy database "carrental"/i
    );
  });

  it('explicitly refuses case variants and padded variants of "carrental"', () => {
    expect(() => assertSafeTestDatabase('CARRENTAL')).toThrow(
      /Refusing to connect to legacy database "carrental"/i
    );
    expect(() => assertSafeTestDatabase('  carrental  ')).toThrow(
      /Refusing to connect to legacy database "carrental"/i
    );
    expect(() => assertSafeTestDatabase('CarRental')).toThrow(
      /Refusing to connect to legacy database "carrental"/i
    );
  });

  it('explicitly refuses any database name that does not end with _test', () => {
    expect(() => assertSafeTestDatabase('carrental_prod')).toThrow(
      /must strictly end with "_test"/i
    );
    expect(() => assertSafeTestDatabase('production_db')).toThrow(
      /must strictly end with "_test"/i
    );
    expect(() => assertSafeTestDatabase('wanderwheels_live')).toThrow(
      /must strictly end with "_test"/i
    );
    expect(() => assertSafeTestDatabase('wanderwheels')).toThrow(
      /must strictly end with "_test"/i
    );
  });

  it('rejects empty or null database names', () => {
    expect(() => assertSafeTestDatabase('')).toThrow(
      /Database name cannot be empty/i
    );
    expect(() => assertSafeTestDatabase(null)).toThrow(
      /Database name cannot be empty/i
    );
    expect(() => assertSafeTestDatabase(undefined)).toThrow(
      /Database name cannot be empty/i
    );
    expect(() => assertSafeTestDatabase('   ')).toThrow(
      /Database name cannot be empty/i
    );
  });

  it('accepts isolated test databases ending with _test', () => {
    expect(assertSafeTestDatabase('wanderwheels_demo_test')).toBe('wanderwheels_demo_test');
    expect(assertSafeTestDatabase('wanderwheels_jest_test')).toBe('wanderwheels_jest_test');
    expect(assertSafeTestDatabase('wanderwheels_e2e_test')).toBe('wanderwheels_e2e_test');
    expect(assertSafeTestDatabase('custom_scratch_test')).toBe('custom_scratch_test');
  });
});
