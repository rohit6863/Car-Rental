'use strict';
const { query } = require('../db/pool');
const { NotFoundError } = require('../utils/errors');

class UsersService {
  /**
   * Get user profile by email.
   * Fixes B4 bug: Country now accurately maps to `Country` column.
   */
  async getProfile(email) {
    const [rows] = await query(`
      SELECT id, FullName, EmailId, ContactNo, dob, Address, City, Country, RegDate, UpdationDate
      FROM tblusers
      WHERE EmailId = ?
    `, [email]);

    if (rows.length === 0) throw new NotFoundError('User');
    return rows[0];
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
   * Admin: List all registered users with KYC details & trip count.
   */
  async adminGetAllUsers() {
    const [rows] = await query(`
      SELECT
        u.id, u.FullName, u.EmailId, u.ContactNo, u.dob, u.Address, u.City, u.Country,
        u.RegDate, u.DrivingLicenseNo, u.KycStatus,
        COUNT(b.id) AS tripCount
      FROM tblusers u
      LEFT JOIN tblbooking b ON b.userEmail = u.EmailId AND b.Status = 1
      GROUP BY u.id
      ORDER BY u.id DESC
    `);
    return rows;
  }

  /**
   * Admin: Update driver KYC verification status and license number.
   */
  async adminUpdateKyc(userId, { kycStatus, drivingLicenseNo }) {
    const [result] = await query(
      `UPDATE tblusers
       SET KycStatus = ?,
           DrivingLicenseNo = COALESCE(?, DrivingLicenseNo)
       WHERE id = ?`,
      [kycStatus, drivingLicenseNo === undefined ? null : drivingLicenseNo, userId]
    );
    if (result.affectedRows === 0) throw new NotFoundError('User');
    return { success: true, kycStatus };
  }
}

module.exports = new UsersService();
