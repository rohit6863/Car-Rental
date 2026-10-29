'use strict';
const { query } = require('../../db/pool');

class AdminStatsService {
  async getDashboardStats() {
    const [[usersRow]]       = await query('SELECT COUNT(*) as count FROM tblusers');
    const [[vehiclesRow]]    = await query('SELECT COUNT(*) as count FROM tblvehicles');
    const [[bookingsRow]]    = await query('SELECT COUNT(*) as count FROM tblbooking');
    const [[brandsRow]]      = await query('SELECT COUNT(*) as count FROM tblbrands');
    const [[subscribersRow]] = await query('SELECT COUNT(*) as count FROM tblsubscribers');
    const [[queriesRow]]     = await query('SELECT COUNT(*) as count FROM tblcontactusquery');

    return {
      regUsers: usersRow.count,
      listedVehicles: vehiclesRow.count,
      totalBookings: bookingsRow.count,
      listedBrands: brandsRow.count,
      subscribers: subscribersRow.count,
      queries: queriesRow.count,
    };
  }
}

module.exports = new AdminStatsService();
