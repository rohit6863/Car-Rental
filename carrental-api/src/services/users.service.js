'use strict';
const fs = require('fs');
const path = require('path');
const { query } = require('../db/pool');
const { NotFoundError } = require('../utils/errors');
const { kycUploadDir } = require('../utils/upload');

function resolveKycFile(filename) {
  if (!filename) throw new NotFoundError('KYC document');
  const safeName = path.basename(filename);
  const fullPath = path.resolve(kycUploadDir, safeName);
  if (!fullPath.startsWith(path.resolve(kycUploadDir)) || !fs.existsSync(fullPath)) {
    throw new NotFoundError('KYC document');
  }
  return fullPath;
}

class UsersService {
  /**
   * Get user profile by email.
   * Fixes B4 bug: Country now accurately maps to `Country` column.
   */
  async getProfile(email) {
    const [rows] = await query(`
      SELECT id, FullName, EmailId, ContactNo, dob, Address, City, Country, RegDate, UpdationDate,
             DrivingLicenseNo, KycStatus, KycDocumentPath, KycSubmittedAt, KycRejectionReason
      FROM tblusers
      WHERE EmailId = ?
    `, [email]);

    if (rows.length === 0) throw new NotFoundError('User');
    const row = rows[0];
    const hasDoc = Boolean(row.KycDocumentPath);
    const { KycDocumentPath, ...publicRow } = row;

    return {
      ...publicRow,
      drivingLicenseNo: row.DrivingLicenseNo || '',
      kycStatus: row.KycStatus || 'Pending',
      kycSubmittedAt: row.KycSubmittedAt || null,
      kycRejectionReason: row.KycRejectionReason || null,
      hasKycDocument: hasDoc,
      kycDocumentUrl: hasDoc ? '/api/users/kyc-document' : null,
    };
  }

  /**
   * Update user profile.
   */
  async updateProfile(email, { fullname, mobilenumber, dob, address, city, country }) {
    await query(`
      UPDATE tblusers
      SET FullName = ?, ContactNo = ?, dob = ?, Address = ?, City = ?, Country = ?
      WHERE EmailId = ?
    `, [fullname, mobilenumber, dob || '', address || '', city || '', country || '', email]);

    return { success: true, message: 'Profile Updated Successfully' };
  }

  /**
   * Customer: Submit or resubmit Driving License KYC with optional document photo.
   */
  async submitKyc(email, { drivingLicenseNo, documentFilename }) {
    const [existingRows] = await query(
      'SELECT id, KycDocumentPath FROM tblusers WHERE EmailId = ?',
      [email]
    );
    if (existingRows.length === 0) throw new NotFoundError('User');
    const previousPath = existingRows[0].KycDocumentPath;

    await query(
      `UPDATE tblusers
       SET DrivingLicenseNo = ?,
           KycStatus = 'Pending',
           KycSubmittedAt = NOW(),
           KycRejectionReason = NULL,
           KycDocumentPath = COALESCE(?, KycDocumentPath)
       WHERE EmailId = ?`,
      [drivingLicenseNo.trim(), documentFilename || null, email]
    );

    if (documentFilename && previousPath && previousPath !== documentFilename) {
      try {
        const oldFull = path.resolve(kycUploadDir, path.basename(previousPath));
        if (oldFull.startsWith(path.resolve(kycUploadDir)) && fs.existsSync(oldFull)) {
          fs.unlinkSync(oldFull);
        }
      } catch {}
    }

    const updated = await this.getProfile(email);
    return {
      success: true,
      message: 'Driving License KYC submitted and queued for verification.',
      kyc: {
        drivingLicenseNo: updated.drivingLicenseNo,
        kycStatus: updated.kycStatus,
        kycSubmittedAt: updated.kycSubmittedAt,
        kycRejectionReason: updated.kycRejectionReason,
        hasKycDocument: updated.hasKycDocument,
        kycDocumentUrl: updated.kycDocumentUrl,
      },
    };
  }

  /**
   * Customer: Resolve own KYC document path securely.
   */
  async getCustomerKycDocumentPath(email) {
    const [rows] = await query(
      'SELECT KycDocumentPath FROM tblusers WHERE EmailId = ?',
      [email]
    );
    if (rows.length === 0) throw new NotFoundError('User');
    return resolveKycFile(rows[0].KycDocumentPath);
  }

  /**
   * Admin: Resolve user's KYC document path securely.
   */
  async adminGetKycDocumentPath(userId) {
    const [rows] = await query(
      'SELECT KycDocumentPath FROM tblusers WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) throw new NotFoundError('User');
    return resolveKycFile(rows[0].KycDocumentPath);
  }

  /**
   * Admin: List all registered users with KYC details & trip count.
   */
  async adminGetAllUsers() {
    const [rows] = await query(`
      SELECT
        u.id, u.FullName, u.EmailId, u.ContactNo, u.dob, u.Address, u.City, u.Country,
        u.RegDate, u.DrivingLicenseNo, u.KycStatus, u.KycSubmittedAt, u.KycRejectionReason,
        u.KycDocumentPath,
        COUNT(b.id) AS tripCount
      FROM tblusers u
      LEFT JOIN tblbooking b ON b.userEmail = u.EmailId AND b.Status = 1
      GROUP BY u.id
      ORDER BY u.id DESC
    `);
    return rows.map(({ KycDocumentPath, ...rest }) => ({
      ...rest,
      hasKycDocument: Boolean(KycDocumentPath),
      kycDocumentUrl: KycDocumentPath ? `/api/admin/users/${rest.id}/kyc-document` : null,
    }));
  }

  /**
   * Admin: Update driver KYC verification status, license number, and rejection reason.
   */
  async adminUpdateKyc(userId, { status, kycStatus, drivingLicenseNo, rejectionReason }) {
    const nextStatus = status || kycStatus;
    const nextReason =
      nextStatus === 'Rejected'
        ? (rejectionReason && rejectionReason.trim()) || 'Driving license details could not be verified'
        : null;

    const [result] = await query(
      `UPDATE tblusers
       SET KycStatus = ?,
           DrivingLicenseNo = COALESCE(?, DrivingLicenseNo),
           KycRejectionReason = ?
       WHERE id = ?`,
      [
        nextStatus,
        drivingLicenseNo === undefined ? null : drivingLicenseNo,
        nextReason,
        userId,
      ]
    );
    if (result.affectedRows === 0) throw new NotFoundError('User');
    return {
      success: true,
      kycStatus: nextStatus,
      status: nextStatus,
      rejectionReason: nextReason,
    };
  }
}

module.exports = new UsersService();
