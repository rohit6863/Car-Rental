'use strict';
const { query } = require('../db/pool');
const { NotFoundError } = require('../utils/errors');

class ContactService {
  async submitQuery({ fullname, email, contactno, message }) {
    await query(`
      INSERT INTO tblcontactusquery (name, EmailId, ContactNumber, Message, status)
      VALUES (?, ?, ?, ?, 0)
    `, [fullname, email, contactno, message]);

    return { success: true, message: 'Query Sent. We will contact you shortly' };
  }

  async getContactInfo() {
    const [rows] = await query('SELECT Address, EmailId, ContactNo FROM tblcontactusinfo LIMIT 1');
    if (rows.length === 0) {
      return { Address: '', EmailId: '', ContactNo: '' };
    }
    return rows[0];
  }

  async adminGetQueries() {
    const [rows] = await query('SELECT * FROM tblcontactusquery ORDER BY id DESC');
    return rows;
  }

  async adminMarkQueryRead(id) {
    await query('UPDATE tblcontactusquery SET status = 1 WHERE id = ?', [id]);
    return { success: true, message: 'Query marked as read' };
  }

  async adminUpdateContactInfo({ address, email, contactno }) {
    const [rows] = await query('SELECT id FROM tblcontactusinfo LIMIT 1');
    if (rows.length === 0) {
      await query('INSERT INTO tblcontactusinfo (Address, EmailId, ContactNo) VALUES (?, ?, ?)', [address, email, contactno]);
    } else {
      await query('UPDATE tblcontactusinfo SET Address = ?, EmailId = ?, ContactNo = ? WHERE id = ?', [address, email, contactno, rows[0].id]);
    }
    return { success: true, message: 'Contact info updated successfully' };
  }
}

module.exports = new ContactService();
