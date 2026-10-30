'use strict';
const { query } = require('../db/pool');
const { NotFoundError } = require('../utils/errors');
const { sanitizeHtml } = require('../utils/sanitizeHtml');

class PagesService {
  async getPage(type) {
    const [rows] = await query(`
      SELECT id, PageName, type, detail
      FROM tblpages
      WHERE type = ?
    `, [type]);

    if (rows.length === 0) throw new NotFoundError('Page');
    return rows[0];
  }

  async adminGetAll() {
    const [rows] = await query('SELECT id, PageName, type FROM tblpages ORDER BY id ASC');
    return rows;
  }

  async adminUpdate(type, detail) {
    const cleanedDetail = sanitizeHtml(detail);
    const [result] = await query(`
      UPDATE tblpages
      SET detail = ?
      WHERE type = ?
    `, [cleanedDetail, type]);

    if (result.affectedRows === 0) throw new NotFoundError('Page');
    return { success: true, message: 'Page data updated successfully' };
  }
}

module.exports = new PagesService();
