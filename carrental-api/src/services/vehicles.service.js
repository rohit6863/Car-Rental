'use strict';
const { query } = require('../db/pool');
const { expandDateRange } = require('../utils/dates');
const { NotFoundError } = require('../utils/errors');

class VehiclesService {
  /**
   * Get all active vehicles.
   */
  async getAll() {
    const [rows] = await query(`
      SELECT v.*, b.BrandName, b.id as bid
      FROM tblvehicles v
      JOIN tblbrands b ON b.id = v.VehiclesBrand
      WHERE v.Status IS NULL OR v.Status = 1
      ORDER BY v.id DESC
    `);
    return rows;
  }

  /**
   * Get recently listed vehicles (limit 4).
   */
  async getRecent(limit = 4) {
    const [rows] = await query(`
      SELECT v.*, b.BrandName, b.id as bid
      FROM tblvehicles v
      JOIN tblbrands b ON b.id = v.VehiclesBrand
      WHERE v.Status IS NULL OR v.Status = 1
      ORDER BY v.id DESC
      LIMIT ?
    `, [limit]);
    return rows;
  }

  /**
   * Search vehicles by brand and fuel type.
   * Note (B9): Preserves legacy behavior where both brand and fueltype filters are applied.
   */
  async search({ brand, fueltype }) {
    let sql = `
      SELECT v.*, b.BrandName, b.id as bid
      FROM tblvehicles v
      JOIN tblbrands b ON b.id = v.VehiclesBrand
      WHERE (v.Status IS NULL OR v.Status = 1)
    `;
    const params = [];

    if (brand) {
      sql += ' AND v.VehiclesBrand = ?';
      params.push(brand);
    }
    if (fueltype) {
      sql += ' AND v.FuelType = ?';
      params.push(fueltype);
    }

    sql += ' ORDER BY v.id DESC';

    const [rows] = await query(sql, params);
    return rows;
  }

  /**
   * Get single vehicle details by ID.
   */
  async getById(id) {
    const [rows] = await query(`
      SELECT v.*, b.BrandName, b.id as bid
      FROM tblvehicles v
      JOIN tblbrands b ON b.id = v.VehiclesBrand
      WHERE v.id = ?
    `, [id]);

    if (rows.length === 0) throw new NotFoundError('Vehicle');
    return rows[0];
  }

  /**
   * Get similar vehicles of same brand.
   */
  async getSimilar(brandId, excludeVehicleId = null) {
    let sql = `
      SELECT v.*, b.BrandName, b.id as bid
      FROM tblvehicles v
      JOIN tblbrands b ON b.id = v.VehiclesBrand
      WHERE v.VehiclesBrand = ? AND (v.Status IS NULL OR v.Status = 1)
    `;
    const params = [brandId];

    if (excludeVehicleId) {
      sql += ' AND v.id != ?';
      params.push(excludeVehicleId);
    }

    sql += ' LIMIT 4';
    const [rows] = await query(sql, params);
    return rows;
  }

  /**
   * Get booked dates for a vehicle (only Confirmed bookings block dates).
   */
  async getBookedDates(vehicleId) {
    const [bookings] = await query(`
      SELECT FromDate, ToDate
      FROM tblbooking
      WHERE VehicleId = ? AND Status = 1
    `, [vehicleId]);

    const bookedSet = new Set();
    for (const b of bookings) {
      // Normalize or extract date range
      if (b.FromDate && b.ToDate) {
        try {
          const dates = expandDateRange(b.FromDate, b.ToDate);
          dates.forEach(d => bookedSet.add(d));
        } catch {
          // Skip corrupt date strings if any
        }
      }
    }

    return Array.from(bookedSet).sort();
  }

  /**
   * Check vehicle availability for a given date range.
   * Matches legacy check_availability.php logic.
   */
  async checkAvailability(vehicleId, fromDate, toDate) {
    const [rows] = await query(`
      SELECT COUNT(*) as bookingCount
      FROM tblbooking
      WHERE VehicleId = ?
        AND Status = 1
        AND (
          (FromDate BETWEEN ? AND ?)
          OR (ToDate BETWEEN ? AND ?)
          OR (? BETWEEN FromDate AND ToDate)
        )
    `, [vehicleId, fromDate, toDate, fromDate, toDate, fromDate]);

    const isAvailable = (rows[0].bookingCount === 0);
    return {
      available: isAvailable,
      message: isAvailable ? 'Vehicle is available' : 'Vehicle is not available for selected dates'
    };
  }

  // --- Admin Methods ---

  async adminGetAll() {
    const [rows] = await query(`
      SELECT v.*, b.BrandName
      FROM tblvehicles v
      JOIN tblbrands b ON b.id = v.VehiclesBrand
      ORDER BY v.id DESC
    `);
    return rows;
  }

  async adminCreate(vehicleData, imageFilenames = {}) {
    const sql = `
      INSERT INTO tblvehicles (
        VehiclesTitle, VehiclesBrand, VehiclesOverview, PricePerDay, FuelType,
        ModelYear, SeatingCapacity, Vimage1, Vimage2, Vimage3, Vimage4, Vimage5,
        AirConditioner, PowerDoorLocks, AntiLockBrakingSystem, BrakeAssist,
        PowerSteering, DriverAirbag, PassengerAirbag, PowerWindows, CDPlayer,
        CentralLocking, CrashSensor, LeatherSeats, Status, vehicle_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Available')
    `;

    const params = [
      vehicleData.vehicletitle,
      vehicleData.brandname,
      vehicleData.vehicalorcview,
      vehicleData.priceperday,
      vehicleData.fueltype,
      vehicleData.modelyear,
      vehicleData.seatingcapacity,
      imageFilenames.vimage1 || '',
      imageFilenames.vimage2 || '',
      imageFilenames.vimage3 || '',
      imageFilenames.vimage4 || '',
      imageFilenames.vimage5 || '',
      vehicleData.airconditioner || 0,
      vehicleData.powerdoorlocks || 0,
      vehicleData.antilockbrakingsys || 0,
      vehicleData.brakeassist || 0,
      vehicleData.powersteering || 0,
      vehicleData.driverairbag || 0,
      vehicleData.passengerairbag || 0,
      vehicleData.powerwindow || 0,
      vehicleData.cdplayer || 0,
      vehicleData.centrallocking || 0,
      vehicleData.crashcensor || 0,
      vehicleData.leatherseats || 0,
    ];

    const [result] = await query(sql, params);
    return { id: result.insertId };
  }

  async adminUpdate(id, vehicleData) {
    const sql = `
      UPDATE tblvehicles SET
        VehiclesTitle = ?, VehiclesBrand = ?, VehiclesOverview = ?, PricePerDay = ?,
        FuelType = ?, ModelYear = ?, SeatingCapacity = ?,
        AirConditioner = ?, PowerDoorLocks = ?, AntiLockBrakingSystem = ?, BrakeAssist = ?,
        PowerSteering = ?, DriverAirbag = ?, PassengerAirbag = ?, PowerWindows = ?,
        CDPlayer = ?, CentralLocking = ?, CrashSensor = ?, LeatherSeats = ?
      WHERE id = ?
    `;

    const params = [
      vehicleData.vehicletitle,
      vehicleData.brandname,
      vehicleData.vehicalorcview,
      vehicleData.priceperday,
      vehicleData.fueltype,
      vehicleData.modelyear,
      vehicleData.seatingcapacity,
      vehicleData.airconditioner || 0,
      vehicleData.powerdoorlocks || 0,
      vehicleData.antilockbrakingsys || 0,
      vehicleData.brakeassist || 0,
      vehicleData.powersteering || 0,
      vehicleData.driverairbag || 0,
      vehicleData.passengerairbag || 0,
      vehicleData.powerwindow || 0,
      vehicleData.cdplayer || 0,
      vehicleData.centrallocking || 0,
      vehicleData.crashcensor || 0,
      vehicleData.leatherseats || 0,
      id,
    ];

    await query(sql, params);
    return { success: true };
  }

  async adminUpdateImage(id, imageNum, filename) {
    const queries = {
      1: 'UPDATE tblvehicles SET Vimage1 = ? WHERE id = ?',
      2: 'UPDATE tblvehicles SET Vimage2 = ? WHERE id = ?',
      3: 'UPDATE tblvehicles SET Vimage3 = ? WHERE id = ?',
      4: 'UPDATE tblvehicles SET Vimage4 = ? WHERE id = ?',
      5: 'UPDATE tblvehicles SET Vimage5 = ? WHERE id = ?',
    };
    const updateSql = queries[Number(imageNum)];
    if (!updateSql) {
      throw new ValidationError('Invalid image slot number (must be 1-5)');
    }
    await query(updateSql, [filename, id]);
    return { success: true };
  }

  async adminDelete(id) {
    // Soft delete / delete
    await query('DELETE FROM tblvehicles WHERE id = ?', [id]);
    return { success: true };
  }
}

module.exports = new VehiclesService();
