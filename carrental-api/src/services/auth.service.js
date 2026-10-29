'use strict';
const crypto = require('crypto');
const { query } = require('../db/pool');
const { hashPassword, verifyPassword } = require('../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AuthError, ConflictError, NotFoundError, ValidationError } = require('../utils/errors');

class AuthService {
  /**
   * Register a new user with Argon2id password hash.
   */
  async register({ fullname, emailid, mobileno, password }) {
    const [existing] = await query('SELECT id FROM tblusers WHERE EmailId = ?', [emailid]);
    if (existing.length > 0) {
      throw new ConflictError('Email already registered.');
    }

    const hashed = await hashPassword(password);
    const [result] = await query(
      `INSERT INTO tblusers (FullName, EmailId, ContactNo, Password, password_hash, auth_provider)
       VALUES (?, ?, ?, '', ?, 'local')`,
      [fullname, emailid, mobileno, hashed]
    );

    const user = {
      id: result.insertId,
      email: emailid,
      fullname,
      role: 'user',
    };

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  /**
   * User login with lazy Argon2id migration.
   */
  async login({ email, password }) {
    const [rows] = await query(
      'SELECT id, FullName, EmailId, Password, password_hash FROM tblusers WHERE EmailId = ?',
      [email]
    );

    if (rows.length === 0) {
      throw new AuthError('Invalid Details');
    }

    const userRow = rows[0];
    const { valid, needsRehash } = await verifyPassword(password, userRow);

    if (!valid) {
      throw new AuthError('Invalid Details');
    }

    // Lazy migration from MD5 to Argon2id
    if (needsRehash) {
      const newHash = await hashPassword(password);
      await query(
        'UPDATE tblusers SET password_hash = ?, Password = NULL WHERE id = ?',
        [newHash, userRow.id]
      );
    }

    const user = {
      id: userRow.id,
      email: userRow.EmailId,
      fullname: userRow.FullName,
      role: 'user',
    };

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return { user, accessToken, refreshToken };
  }

  /**
   * Admin login with lazy Argon2id migration and forced password change check.
   */
  async adminLogin({ username, password }) {
    const [rows] = await query(
      'SELECT id, UserName, Password, password_hash, must_change_password FROM admin WHERE UserName = ?',
      [username]
    );

    if (rows.length === 0) {
      throw new AuthError('Invalid Details');
    }

    const adminRow = rows[0];
    const { valid, needsRehash } = await verifyPassword(password, adminRow);

    if (!valid) {
      throw new AuthError('Invalid Details');
    }

    let mustChangePassword = adminRow.must_change_password === 1;

    // If MD5 or newly seeded admin
    if (needsRehash) {
      const newHash = await hashPassword(password);
      await query(
        'UPDATE admin SET password_hash = ?, Password = NULL, must_change_password = 1 WHERE id = ?',
        [newHash, adminRow.id]
      );
      mustChangePassword = true;
    }

    const admin = {
      id: adminRow.id,
      username: adminRow.UserName,
      role: 'admin',
      mustChangePassword,
    };

    const accessToken = signAccessToken(admin);
    const refreshToken = signRefreshToken(admin);

    return { admin, accessToken, refreshToken, mustChangePassword };
  }

  /**
   * Check if email exists (used by registration live validator).
   */
  async checkEmail(email) {
    const [rows] = await query('SELECT id FROM tblusers WHERE EmailId = ?', [email]);
    return { available: rows.length === 0 };
  }

  /**
   * Admin change own password (clears must_change_password flag).
   */
  async adminChangePassword(adminId, { password, newpassword }) {
    const [rows] = await query(
      'SELECT id, Password, password_hash FROM admin WHERE id = ?',
      [adminId]
    );
    if (rows.length === 0) throw new NotFoundError('Admin');

    const adminRow = rows[0];
    const { valid } = await verifyPassword(password, adminRow);
    if (!valid) {
      throw new ValidationError('Your current password is wrong');
    }

    const newHash = await hashPassword(newpassword);
    await query(
      'UPDATE admin SET password_hash = ?, Password = NULL, must_change_password = 0 WHERE id = ?',
      [newHash, adminId]
    );

    return { success: true, message: 'Your Password successfully changed' };
  }

  /**
   * User change own password while logged in.
   */
  async userChangePassword(userId, email, { password, newpassword }) {
    const [rows] = await query(
      'SELECT id, Password, password_hash FROM tblusers WHERE id = ? AND EmailId = ?',
      [userId, email]
    );
    if (rows.length === 0) throw new NotFoundError('User');

    const userRow = rows[0];
    const { valid } = await verifyPassword(password, userRow);
    if (!valid) {
      throw new ValidationError('Your current password is wrong');
    }

    const newHash = await hashPassword(newpassword);
    await query(
      'UPDATE tblusers SET password_hash = ?, Password = NULL WHERE id = ?',
      [newHash, userId]
    );

    return { success: true, message: 'Your Password successfully changed' };
  }

  /**
   * Request password reset token.
   */
  async forgotPassword(email) {
    const [rows] = await query('SELECT id, FullName FROM tblusers WHERE EmailId = ?', [email]);
    if (rows.length === 0) {
      // Return generic message to prevent email enumeration
      return { success: true, message: 'If this email is registered, you will receive a reset link shortly.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'INSERT INTO tbl_password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)',
      [email, tokenHash, expiresAt]
    );

    // In dev / test, log the token. In prod, send via nodemailer.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PASSWORD RESET] Token for ${email}: ${rawToken}`);
    }

    return {
      success: true,
      message: 'If this email is registered, you will receive a reset link shortly.',
      ...(process.env.NODE_ENV === 'test' ? { _devToken: rawToken } : {})
    };
  }

  /**
   * Reset password using secure token.
   */
  async resetPassword({ token, newpassword }) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await query(
      'SELECT id, email, expires_at, used FROM tbl_password_resets WHERE token_hash = ? AND used = 0',
      [tokenHash]
    );

    if (rows.length === 0) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const resetRecord = rows[0];
    if (new Date(resetRecord.expires_at) < new Date()) {
      throw new ValidationError('Reset token has expired');
    }

    const newHash = await hashPassword(newpassword);
    await query(
      'UPDATE tblusers SET password_hash = ?, Password = NULL WHERE EmailId = ?',
      [newHash, resetRecord.email]
    );

    await query('UPDATE tbl_password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

    return { success: true, message: 'Your Password successfully changed' };
  }

  /**
   * Rotate / refresh access token.
   */
  async refreshToken(refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    const newAccessToken = signAccessToken({
      id: payload.id,
      email: payload.email,
      username: payload.username,
      fullname: payload.fullname,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    });
    return { accessToken: newAccessToken };
  }
}

module.exports = new AuthService();
