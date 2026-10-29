'use strict';
const { query } = require('../db/pool');
const { NotFoundError } = require('../utils/errors');

class BrandsService {
  async getAll() {
    const [rows] = await query('SELECT * FROM tblbrands ORDER BY BrandName ASC');
    return rows;
  }

  async getById(id) {
    const [rows] = await query('SELECT * FROM tblbrands WHERE id = ?', [id]);
    if (rows.length === 0) throw new NotFoundError('Brand');
    return rows[0];
  }

  async create(brandName) {
    const [result] = await query('INSERT INTO tblbrands (BrandName) VALUES (?)', [brandName]);
    return { id: result.insertId, BrandName: brandName };
  }

  async update(id, brandName) {
    await query('UPDATE tblbrands SET BrandName = ? WHERE id = ?', [brandName, id]);
    return { id, BrandName: brandName };
  }

  async delete(id) {
    await query('DELETE FROM tblbrands WHERE id = ?', [id]);
    return { success: true };
  }
}

module.exports = new BrandsService();
