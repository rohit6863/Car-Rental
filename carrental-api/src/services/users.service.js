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
   * Admin: List all registered users.
   */
  async adminGetAllUsers() {
    const [rows] = await query(`
      SELECT id, FullName, EmailId, ContactNo, dob, Address, City, Country, RegDate
      FROM tblusers
      ORDER BY id DESC
    `);
    return rows;
  }
}

module.exports = new UsersService();
