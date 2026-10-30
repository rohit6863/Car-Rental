'use strict';
const crypto = require('crypto');
const { query } = require('../db/pool');
const { hashPassword, verifyPassword, verifyArgon2 } = require('../utils/crypto');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AuthError, ConflictError, NotFoundError, ValidationError } = require('../utils/errors');
const { checkAccountLockout, recordFailedAttempt, clearFailedAttempts } = require('../utils/accountLockout');
const { auditLog } = require('../utils/auditLogger');
const mailService = require('./mail.service');

// Pre-computed Argon2id hash for constant-time verification when an account does not exist (mitigates timing enumeration)
const DUMMY_ARGON2_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ1Njc4OTA$tK6R8Z6B6Cg5h9d+Gz4v+gV3b8k4e7d9y0x1w2v3u4t';

class AuthService {
  /**
   * Helper: Hash a raw refresh token using SHA-256 for database storage.
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper: Record a refresh token session in tbl_refresh_tokens with family grouping.
   */
  async createRefreshTokenSession(userType, userId, familyId = null) {
    const family = familyId || crypto.randomUUID();
    const jti = crypto.randomBytes(16).toString('hex');
    const token = signRefreshToken({ id: userId, role: userType, familyId: family, jti });
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(`
      INSERT INTO tbl_refresh_tokens (user_type, user_id, family_id, token_hash, is_revoked, expires_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [userType, userId, family, tokenHash, expiresAt]);

    return { refreshToken: token, familyId: family };
  }

  /**
   * Helper: Revoke a specific refresh token by its hash.
   */
  async revokeRefreshToken(token) {
    if (!token) return;
    const tokenHash = this.hashToken(token);
    await query('UPDATE tbl_refresh_tokens SET is_revoked = 1 WHERE token_hash = ?', [tokenHash]);
  }

  /**
   * Helper: Revoke all active sessions/refresh tokens for a user or admin.
   */
  async revokeAllUserSessions(userType, userId) {
    await query('UPDATE tbl_refresh_tokens SET is_revoked = 1 WHERE user_type = ? AND user_id = ?', [userType, userId]);
  }

  /**
   * Register a new user with Argon2id password hash.
   */
  async register({ fullname, emailid, mobileno, password }, ip = '0.0.0.0') {
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
    const { refreshToken } = await this.createRefreshTokenSession('user', user.id);

    auditLog('USER_REGISTRATION_SUCCESS', {
      actorType: 'user',
      actorId: user.id,
      ip,
      details: { email: emailid },
    });

    return { user, accessToken, refreshToken };
  }

  /**
   * User login with lazy Argon2id migration, constant-time failure, and account lockout.
   */
  async login({ email, password }, ip = '0.0.0.0') {
    await checkAccountLockout(email, ip, false);

    const [rows] = await query(
      'SELECT id, FullName, EmailId, Password, password_hash FROM tblusers WHERE EmailId = ?',
      [email]
    );

    if (rows.length === 0) {
      // Constant-time dummy verify to prevent timing enumeration
      await verifyArgon2(DUMMY_ARGON2_HASH, password);
      await recordFailedAttempt(email, ip);
      auditLog('USER_LOGIN_FAILED', { ip, details: { email, reason: 'unknown_user' } });
      throw new AuthError('Invalid Details');
    }

    const userRow = rows[0];

    // If account has no password set (e.g. Google sign-up or linked account), run dummy Argon2
    // verification to guarantee constant-time execution and prevent user password-state enumeration
    if (!userRow.password_hash && !userRow.Password) {
      await verifyArgon2(DUMMY_ARGON2_HASH, password);
      await recordFailedAttempt(email, ip);
      auditLog('USER_LOGIN_FAILED', {
        actorType: 'user',
        actorId: userRow.id,
        ip,
        details: { email, reason: 'passwordless_account' },
      });
      throw new AuthError('Invalid Details');
    }

    const { valid, needsRehash } = await verifyPassword(password, userRow);

    if (!valid) {
      await recordFailedAttempt(email, ip);
      auditLog('USER_LOGIN_FAILED', {
        actorType: 'user',
        actorId: userRow.id,
        ip,
        details: { email, reason: 'bad_password' },
      });
      throw new AuthError('Invalid Details');
    }

    // Clear failed attempts on success
    await clearFailedAttempts(email, ip);

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
    const { refreshToken } = await this.createRefreshTokenSession('user', user.id);

    auditLog('USER_LOGIN_SUCCESS', {
      actorType: 'user',
      actorId: user.id,
      ip,
      details: { email },
    });

    return { user, accessToken, refreshToken };
  }

  /**
   * Admin login with lazy Argon2id migration, forced password change check, and constant-time failure.
   */
  async adminLogin({ username, password }, ip = '0.0.0.0') {
    await checkAccountLockout(username, ip, true);

    const [rows] = await query(
      'SELECT id, UserName, Password, password_hash, must_change_password FROM admin WHERE UserName = ?',
      [username]
    );

    if (rows.length === 0) {
      // Constant-time dummy verify
      await verifyArgon2(DUMMY_ARGON2_HASH, password);
      await recordFailedAttempt(username, ip);
      auditLog('ADMIN_LOGIN_FAILED', { ip, details: { username, reason: 'unknown_admin' } });
      throw new AuthError('Invalid Details');
    }

    const adminRow = rows[0];
    const { valid, needsRehash } = await verifyPassword(password, adminRow);

    if (!valid) {
      await recordFailedAttempt(username, ip);
      auditLog('ADMIN_LOGIN_FAILED', {
        actorType: 'admin',
        actorId: adminRow.id,
        ip,
        details: { username, reason: 'bad_password' },
      });
      throw new AuthError('Invalid Details');
    }

    await clearFailedAttempts(username, ip);

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
    const { refreshToken } = await this.createRefreshTokenSession('admin', admin.id);

    auditLog('ADMIN_LOGIN_SUCCESS', {
      actorType: 'admin',
      actorId: admin.id,
      ip,
      details: { username, mustChangePassword },
    });

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
   * Admin change own password (clears must_change_password flag & revokes other sessions).
   */
  async adminChangePassword(adminId, { password, newpassword }, ip = '0.0.0.0') {
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

    // Revoke all existing sessions so that other active devices are logged out
    await this.revokeAllUserSessions('admin', adminId);

    auditLog('ADMIN_PASSWORD_CHANGED', {
      actorType: 'admin',
      actorId: adminId,
      ip,
    });

    return { success: true, message: 'Your Password successfully changed' };
  }

  /**
   * User change own password while logged in (clears MD5 and revokes other sessions).
   */
  async userChangePassword(userId, email, { password, newpassword }, ip = '0.0.0.0') {
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

    // Revoke all existing sessions
    await this.revokeAllUserSessions('user', userId);

    auditLog('USER_PASSWORD_CHANGED', {
      actorType: 'user',
      actorId: userId,
      ip,
      details: { email },
    });

    return { success: true, message: 'Your Password successfully changed' };
  }

  /**
   * Request password reset token.
   * Returns generic message in all cases. Sends reset email strictly to database-stored email.
   */
  async forgotPassword(email, ip = '0.0.0.0') {
    const [rows] = await query('SELECT id, FullName, EmailId FROM tblusers WHERE EmailId = ?', [email]);
    if (rows.length === 0) {
      // Dummy constant-time execution
      await verifyArgon2(DUMMY_ARGON2_HASH, 'dummy_pass');
      auditLog('FORGOT_PASSWORD_REQUEST', { ip, details: { email, found: false } });
      return { success: true, message: 'If this email is registered, you will receive a reset link shortly.' };
    }

    const dbUser = rows[0];
    const targetEmail = dbUser.EmailId; // strictly use the address stored in the database!

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      'INSERT INTO tbl_password_resets (email, token_hash, expires_at) VALUES (?, ?, ?)',
      [targetEmail, tokenHash, expiresAt]
    );

    // Send reset email strictly to the database-stored address
    await mailService.sendPasswordResetEmail(targetEmail, rawToken);

    // In dev, print token to server console only (never in HTTP response)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PASSWORD RESET CONSOLE] Token for ${targetEmail}: ${rawToken}`);
    }

    auditLog('FORGOT_PASSWORD_REQUEST', { ip, details: { email: targetEmail, found: true } });

    return {
      success: true,
      message: 'If this email is registered, you will receive a reset link shortly.',
    };
  }

  /**
   * Reset password using secure token.
   */
  async resetPassword({ token, newpassword }, ip = '0.0.0.0') {
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

    // Revoke all sessions for this user
    const [userRows] = await query('SELECT id FROM tblusers WHERE EmailId = ?', [resetRecord.email]);
    if (userRows.length > 0) {
      await this.revokeAllUserSessions('user', userRows[0].id);
    }

    auditLog('USER_PASSWORD_RESET_SUCCESS', {
      ip,
      details: { email: resetRecord.email },
    });

    return { success: true, message: 'Your Password successfully changed' };
  }

  /**
   * Rotate refresh token with reuse detection.
   * If a reused refresh token is presented, the entire family is immediately revoked!
   */
  async refreshToken(incomingRefreshToken, ip = '0.0.0.0') {
    const payload = verifyRefreshToken(incomingRefreshToken);
    const tokenHash = this.hashToken(incomingRefreshToken);

    const [rows] = await query(`
      SELECT id, user_type, user_id, family_id, is_revoked, expires_at
      FROM tbl_refresh_tokens
      WHERE token_hash = ?
    `, [tokenHash]);

    if (rows.length === 0) {
      throw new AuthError('Invalid or unrecognized refresh token');
    }

    const tokenRecord = rows[0];

    // Check expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new AuthError('Refresh token has expired');
    }

    // Reuse detection: If token was already revoked, someone is reusing an old token!
    if (tokenRecord.is_revoked === 1) {
      // Invalidate the entire family chain immediately!
      await query('UPDATE tbl_refresh_tokens SET is_revoked = 1 WHERE family_id = ?', [tokenRecord.family_id]);
      auditLog('REFRESH_TOKEN_REUSE_DETECTED', {
        actorType: tokenRecord.user_type,
        actorId: tokenRecord.user_id,
        ip,
        details: { familyId: tokenRecord.family_id },
      });
      throw new AuthError('Refresh token reuse detected. All sessions in this family have been revoked.');
    }

    // Mark current token as revoked
    await query('UPDATE tbl_refresh_tokens SET is_revoked = 1 WHERE id = ?', [tokenRecord.id]);

    // Generate rotated refresh token in the same family
    const { refreshToken: newRefreshToken } = await this.createRefreshTokenSession(
      tokenRecord.user_type,
      tokenRecord.user_id,
      tokenRecord.family_id
    );

    // Fetch user details for new access token
    let actorData = {};
    if (tokenRecord.user_type === 'admin') {
      const [adminRows] = await query('SELECT id, UserName, must_change_password FROM admin WHERE id = ?', [tokenRecord.user_id]);
      if (adminRows.length === 0) throw new AuthError('Admin not found');
      actorData = {
        id: adminRows[0].id,
        username: adminRows[0].UserName,
        role: 'admin',
        mustChangePassword: adminRows[0].must_change_password === 1,
      };
    } else {
      const [userRows] = await query('SELECT id, FullName, EmailId FROM tblusers WHERE id = ?', [tokenRecord.user_id]);
      if (userRows.length === 0) throw new AuthError('User not found');
      actorData = {
        id: userRows[0].id,
        email: userRows[0].EmailId,
        fullname: userRows[0].FullName,
        role: 'user',
      };
    }

    const newAccessToken = signAccessToken(actorData);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      userType: tokenRecord.user_type,
    };
  }
}

module.exports = new AuthService();
