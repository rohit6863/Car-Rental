'use strict';
const argon2 = require('argon2');
const crypto = require('crypto');

/**
 * Hash a password with Argon2id (current standard).
 * @param {string} password
 * @returns {Promise<string>} Argon2id hash starting with "$argon2id$"
 */
async function hashPassword(password) {
  if (typeof password !== 'string' || password.length > 128) {
    throw new Error('Password must not exceed 128 characters');
  }
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MiB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a password against an Argon2id hash.
 * @param {string} hash
 * @param {string} password
 * @returns {Promise<boolean>}
 */
async function verifyArgon2(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Compute MD5 hash (legacy only – DO NOT use for new passwords).
 * Used solely to verify existing legacy hashes on first login.
 * @param {string} password
 * @returns {string} hex MD5
 */
function md5Legacy(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

/**
 * Detect whether a stored hash is a legacy MD5 (32-char hex, no "$" prefix).
 * @param {string} storedHash
 * @returns {boolean}
 */
function isLegacyMd5(storedHash) {
  return /^[0-9a-f]{32}$/i.test(storedHash);
}

/**
 * Verify password against either Argon2id or legacy MD5.
 * Returns { valid: boolean, needsRehash: boolean }.
 *
 * On needsRehash===true the caller MUST:
 *   1. hash the plain password with hashPassword()
 *   2. store it in password_hash (Argon2id column)
 *   3. set Password (MD5 column) to NULL or empty string
 *
 * @param {string} plaintext
 * @param {{password_hash: string|null, Password: string|null}} row  DB row
 */
async function verifyPassword(plaintext, row) {
  if (typeof plaintext !== 'string' || plaintext.length > 128) {
    return { valid: false, needsRehash: false };
  }
  // Try Argon2id first (preferred path)
  if (row.password_hash && row.password_hash.startsWith('$argon2')) {
    const valid = await verifyArgon2(row.password_hash, plaintext);
    return { valid, needsRehash: false };
  }

  // Fall back to legacy MD5
  if (row.Password && isLegacyMd5(row.Password)) {
    const valid = md5Legacy(plaintext) === row.Password.toLowerCase();
    return { valid, needsRehash: valid }; // rehash only on success
  }

  return { valid: false, needsRehash: false };
}

module.exports = { hashPassword, verifyArgon2, md5Legacy, isLegacyMd5, verifyPassword };
