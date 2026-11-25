'use strict';
const { query } = require('../../db/pool');
const { computeRentalAmount } = require('../../utils/dates');
const { NotFoundError } = require('../../utils/errors');

class FleetOpsService {
  /**
   * Aggregated real-time dashboard analytics from DB tables.
   */
  async getAnalytics(period = 'year') {
    const [vehicles] = await query(`
      SELECT v.id, v.VehiclesTitle, v.FuelType, v.PricePerDay, v.vehicle_status,
             v.RegistrationPlate, v.HubLocation, b.BrandName
      FROM tblvehicles v
      LEFT JOIN tblbrands b ON b.id = v.VehiclesBrand
    `);

    const [bookings] = await query(`
      SELECT bk.id, bk.VehicleId, bk.FromDate, bk.ToDate, bk.Status, bk.PostingDate, bk.userEmail,
             v.VehiclesTitle, v.PricePerDay, v.HubLocation, br.BrandName, u.FullName, u.KycStatus
      FROM tblbooking bk
      LEFT JOIN tblvehicles v ON v.id = bk.VehicleId
      LEFT JOIN tblbrands br ON br.id = v.VehiclesBrand
      LEFT JOIN tblusers u ON u.EmailId = bk.userEmail
      ORDER BY bk.id DESC
    `);

    const [payments] = await query(`
      SELECT p.id, p.booking_id, p.amount, p.payment_status, p.payment_date, p.confirmation_date
      FROM tblpayments p
    `);

    const [[userAgg]] = await query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN KycStatus = 'Verified' THEN 1 ELSE 0 END) AS verifiedUsers,
        SUM(CASE WHEN KycStatus = 'Pending' THEN 1 ELSE 0 END) AS pendingKycUsers
      FROM tblusers
    `);

    const [[maintAgg]] = await query(`
      SELECT
        COUNT(*) AS totalTasks,
        SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END) AS completedTasks,
        SUM(CASE WHEN Status != 'Completed' THEN 1 ELSE 0 END) AS openTasks
      FROM tblmaintenance
    `);

    const confirmedPayments = payments.filter((p) => p.payment_status === 'confirmed');
    const confirmedPaymentRevenue = confirmedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Also calculate booking value per vehicle for top-performing vehicles & fallback revenue
    const vehiclePerfMap = new Map();
    vehicles.forEach((v) => {
      vehiclePerfMap.set(v.id, {
        id: v.id,
        title: v.VehiclesTitle,
        brand: v.BrandName || '',
        fuelType: v.FuelType,
        status: v.vehicle_status || 'Available',
        revenue: 0,
        trips: 0,
      });
    });

    let confirmedBookingEstimate = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    bookings.forEach((b) => {
      if (b.Status === 1) {
        confirmedCount++;
        let amt = Number(b.PricePerDay || 0);
        try {
          if (b.FromDate && b.ToDate) {
            const calc = computeRentalAmount(b.FromDate, b.ToDate, b.PricePerDay || 0);
            amt = Number(calc.totalAmount || 0);
          }
        } catch {
          // ignore malformed legacy date string
        }
        confirmedBookingEstimate += amt;
        const entry = vehiclePerfMap.get(b.VehicleId);
        if (entry) {
          entry.revenue += amt;
          entry.trips += 1;
        }
      } else if (b.Status === 2) {
        cancelledCount++;
      } else {
        pendingCount++;
      }
    });

    const totalRevenue = confirmedPaymentRevenue > 0 ? confirmedPaymentRevenue : confirmedBookingEstimate;
    const totalTrips = bookings.length;
    const avgBookingValue = confirmedCount > 0 ? Math.round(totalRevenue / confirmedCount) : 0;

    const totalVehicles = vehicles.length;
    const rentedVehicles = vehicles.filter((v) => v.vehicle_status === 'Rented').length;
    const maintenanceVehicles = vehicles.filter((v) => v.vehicle_status === 'Maintenance').length;
    const availableVehicles = Math.max(0, totalVehicles - rentedVehicles - maintenanceVehicles);
    const utilizationPct = totalVehicles > 0 ? Math.round((rentedVehicles / totalVehicles) * 100) : 0;
    const readinessPct = totalVehicles > 0 ? Math.round(((totalVehicles - maintenanceVehicles) / totalVehicles) * 100) : 100;

    const totalTasks = Number(maintAgg?.totalTasks || 0);
    const completedTasks = Number(maintAgg?.completedTasks || 0);
    const openTasks = Number(maintAgg?.openTasks || 0);

    const topVehicles = Array.from(vehiclePerfMap.values())
      .sort((a, b) => b.revenue - a.revenue || b.trips - a.trips)
      .slice(0, 3);

    const upcomingHandovers = bookings
      .filter((b) => b.Status !== 2)
      .slice(0, 2)
      .map((b) => ({
        bookingId: b.id,
        vehicle: b.BrandName ? `${b.BrandName} ${b.VehiclesTitle}` : b.VehiclesTitle,
        customer: b.FullName || b.userEmail,
        fromDate: b.FromDate,
        toDate: b.ToDate,
        hub: b.HubLocation || 'Pune Koregaon Park',
        status: b.Status === 1 ? 'Confirmed' : 'Pending',
        kycStatus: b.KycStatus || 'Pending',
      }));

    // Build monthly or quarterly revenue + payment volume series from real rows
    const now = new Date();
    const bucketLabels = period === 'quarter'
      ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      : [];
    const monthBuckets = [];

    if (period === 'quarter') {
      for (let w = 0; w < 4; w++) {
        monthBuckets.push({ label: bucketLabels[w], revenue: 0, settled: 0 });
      }
      bookings.forEach((b) => {
        if (b.Status !== 1 || !b.PostingDate) return;
        const dt = new Date(b.PostingDate);
        const diffDays = Math.floor((now - dt) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 28) {
          const idx = Math.min(3, Math.floor((27 - diffDays) / 7));
          try {
            const calc = computeRentalAmount(b.FromDate, b.ToDate, b.PricePerDay || 0);
            monthBuckets[idx].revenue += Number(calc.totalAmount || 0);
          } catch {}
        }
      });
      confirmedPayments.forEach((p) => {
        const dt = new Date(p.payment_date || p.confirmation_date || now);
        const diffDays = Math.floor((now - dt) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 28) {
          const idx = Math.min(3, Math.floor((27 - diffDays) / 7));
          monthBuckets[idx].settled += Number(p.amount || 0);
        }
      });
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthBuckets.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleString('en-US', { month: 'short' }),
          revenue: 0,
          settled: 0,
        });
      }
      const bucketMap = new Map(monthBuckets.map((m) => [m.key, m]));
      bookings.forEach((b) => {
        if (b.Status !== 1 || !b.PostingDate) return;
        const dt = new Date(b.PostingDate);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        const bucket = bucketMap.get(key);
        if (bucket) {
          try {
            const calc = computeRentalAmount(b.FromDate, b.ToDate, b.PricePerDay || 0);
            bucket.revenue += Number(calc.totalAmount || 0);
          } catch {}
        }
      });
      confirmedPayments.forEach((p) => {
        const dt = new Date(p.payment_date || p.confirmation_date || now);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        const bucket = bucketMap.get(key);
        if (bucket) {
          bucket.settled += Number(p.amount || 0);
        }
      });
    }

    const totalUsers = Number(userAgg?.totalUsers || 0);
    const verifiedUsers = Number(userAgg?.verifiedUsers || 0);
    const pendingKycUsers = Number(userAgg?.pendingKycUsers || 0);
    const paidBookingsCount = confirmedPayments.length;

    const approvalRate = totalTrips > 0 ? Math.round((confirmedCount / totalTrips) * 100) : 100;

    return {
      kpis: {
        totalRevenue,
        avgBookingValue,
        totalTrips,
        confirmedTrips: confirmedCount,
        utilizationPct,
        rentedVehicles,
        availableVehicles,
        maintenanceVehicles,
        totalVehicles,
      },
      bookingHealth: {
        approvalRate,
        confirmedCount,
        pendingCount,
        cancelledCount,
        totalTrips,
      },
      readiness: {
        readinessPct,
        completedTasks,
        totalTasks,
        openTasks,
      },
      topVehicles,
      upcomingHandovers,
      customers: {
        totalUsers,
        verifiedUsers,
        pendingKycUsers,
      },
      funnel: {
        registeredDrivers: totalUsers,
        kycVerified: verifiedUsers,
        totalBookings: totalTrips,
        confirmedBookings: confirmedCount,
        paidBookings: paidBookingsCount,
        conversionPct: totalTrips > 0 ? Number(((confirmedCount / Math.max(totalTrips, 1)) * 100).toFixed(1)) : 0,
      },
      monthlySeries: monthBuckets.map(({ label, revenue, settled }) => ({
        label,
        revenue: Math.round(revenue),
        settled: Math.round(settled),
      })),
    };
  }

  /**
   * Live operational alerts for header bell dropdown.
   */
  async getAlerts() {
    const [pendingBookings] = await query(`
      SELECT b.id, b.FromDate, v.VehiclesTitle, u.FullName
      FROM tblbooking b
      LEFT JOIN tblvehicles v ON v.id = b.VehicleId
      LEFT JOIN tblusers u ON u.EmailId = b.userEmail
      WHERE b.Status = 0
      ORDER BY b.id DESC
      LIMIT 5
    `);

    const [pendingKyc] = await query(`
      SELECT id, FullName, EmailId
      FROM tblusers
      WHERE KycStatus = 'Pending'
      ORDER BY id DESC
      LIMIT 5
    `);

    const [openMaintenance] = await query(`
      SELECT m.id, m.TaskTitle, m.DueDate, v.VehiclesTitle
      FROM tblmaintenance m
      JOIN tblvehicles v ON v.id = m.VehicleId
      WHERE m.Status != 'Completed'
      ORDER BY m.DueDate ASC
      LIMIT 5
    `);

    const alerts = [];
    pendingBookings.forEach((b) => {
      alerts.push({
        id: `booking-${b.id}`,
        type: 'booking',
        title: `Booking #${b.id} Pending Approval`,
        subtitle: `${b.FullName || 'Customer'} requested ${b.VehiclesTitle} (${b.FromDate})`,
        route: '/manage-bookings',
      });
    });
    pendingKyc.forEach((u) => {
      alerts.push({
        id: `kyc-${u.id}`,
        type: 'kyc',
        title: `Driver KYC Pending`,
        subtitle: `${u.FullName || u.EmailId} awaiting license verification`,
        route: '/reg-users',
      });
    });
    openMaintenance.forEach((m) => {
      alerts.push({
        id: `maint-${m.id}`,
        type: 'maintenance',
        title: `${m.VehiclesTitle}: ${m.TaskTitle}`,
        subtitle: `Due ${m.DueDate ? new Date(m.DueDate).toLocaleDateString() : ''}`,
        route: '/maintenance',
      });
    });

    return {
      totalCount: alerts.length,
      alerts: alerts.slice(0, 8),
    };
  }

  // ─── Maintenance CRUD ───────────────────────────────────────────────────────
  async listMaintenance() {
    const [rows] = await query(`
      SELECT m.*, v.VehiclesTitle, v.RegistrationPlate, b.BrandName
      FROM tblmaintenance m
      JOIN tblvehicles v ON v.id = m.VehicleId
      LEFT JOIN tblbrands b ON b.id = v.VehiclesBrand
      ORDER BY FIELD(m.Status, 'Pending', 'Scheduled', 'Completed'), m.DueDate ASC, m.id DESC
    `);
    return rows;
  }

  async createMaintenance({ vehicleId, taskTitle, dueDate, estimatedCost, status }) {
    const [veh] = await query('SELECT id FROM tblvehicles WHERE id = ?', [vehicleId]);
    if (veh.length === 0) throw new NotFoundError('Vehicle');

    const [result] = await query(
      `INSERT INTO tblmaintenance (VehicleId, TaskTitle, DueDate, EstimatedCost, Status)
       VALUES (?, ?, ?, ?, ?)`,
      [vehicleId, taskTitle, dueDate, estimatedCost, status]
    );
    return { id: result.insertId, success: true };
  }

  async updateMaintenance(id, updates) {
    const [existing] = await query('SELECT id FROM tblmaintenance WHERE id = ?', [id]);
    if (existing.length === 0) throw new NotFoundError('Maintenance task');

    const fields = [];
    const params = [];
    if (updates.status !== undefined) {
      fields.push('Status = ?');
      params.push(updates.status);
    }
    if (updates.taskTitle !== undefined) {
      fields.push('TaskTitle = ?');
      params.push(updates.taskTitle);
    }
    if (updates.dueDate !== undefined) {
      fields.push('DueDate = ?');
      params.push(updates.dueDate);
    }
    if (updates.estimatedCost !== undefined) {
      fields.push('EstimatedCost = ?');
      params.push(updates.estimatedCost);
    }

    if (fields.length > 0) {
      params.push(id);
      await query(`UPDATE tblmaintenance SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return { success: true };
  }

  async deleteMaintenance(id) {
    const [result] = await query('DELETE FROM tblmaintenance WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw new NotFoundError('Maintenance task');
    return { success: true };
  }

  // ─── Pricing Rules ──────────────────────────────────────────────────────────
  async getPricingRules() {
    const [rows] = await query('SELECT * FROM tblpricing_rules WHERE id = 1');
    if (rows.length === 0) {
      return {
        weekendSurgeEnabled: false,
        weekendSurgePct: 15,
        holidaySurgeEnabled: false,
        holidaySurgePct: 20,
      };
    }
    const r = rows[0];
    return {
      weekendSurgeEnabled: Boolean(r.WeekendSurgeEnabled),
      weekendSurgePct: Number(r.WeekendSurgePct),
      holidaySurgeEnabled: Boolean(r.HolidaySurgeEnabled),
      holidaySurgePct: Number(r.HolidaySurgePct),
      updatedAt: r.UpdatedAt,
    };
  }

  async updatePricingRules({ weekendSurgeEnabled, weekendSurgePct, holidaySurgeEnabled, holidaySurgePct }) {
    await query(
      `INSERT INTO tblpricing_rules (id, WeekendSurgeEnabled, WeekendSurgePct, HolidaySurgeEnabled, HolidaySurgePct)
       VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         WeekendSurgeEnabled = VALUES(WeekendSurgeEnabled),
         WeekendSurgePct = VALUES(WeekendSurgePct),
         HolidaySurgeEnabled = VALUES(HolidaySurgeEnabled),
         HolidaySurgePct = VALUES(HolidaySurgePct)`,
      [weekendSurgeEnabled ? 1 : 0, weekendSurgePct, holidaySurgeEnabled ? 1 : 0, holidaySurgePct]
    );
    return this.getPricingRules();
  }

  // ─── Admin Operations Notes CRUD ────────────────────────────────────────────
  async listNotes() {
    const [rows] = await query('SELECT * FROM tbladmin_notes ORDER BY IsDone ASC, id DESC');
    return rows.map((n) => ({
      id: n.id,
      title: n.Title,
      description: n.Description || '',
      category: n.Category,
      isDone: Boolean(n.IsDone),
      createdAt: n.CreatedAt,
    }));
  }

  async createNote({ title, description, category }) {
    const [result] = await query(
      'INSERT INTO tbladmin_notes (Title, Description, Category, IsDone) VALUES (?, ?, ?, 0)',
      [title, description || '', category || 'Fleet Ops']
    );
    return { id: result.insertId, success: true };
  }

  async updateNote(id, { isDone }) {
    const [result] = await query('UPDATE tbladmin_notes SET IsDone = ? WHERE id = ?', [isDone ? 1 : 0, id]);
    if (result.affectedRows === 0) throw new NotFoundError('Note');
    return { success: true, isDone: Boolean(isDone) };
  }

  async deleteNote(id) {
    const [result] = await query('DELETE FROM tbladmin_notes WHERE id = ?', [id]);
    if (result.affectedRows === 0) throw new NotFoundError('Note');
    return { success: true };
  }

  // ─── GST Invoice Data ───────────────────────────────────────────────────────
  async getGstInvoice(bookingId) {
    const [rows] = await query(`
      SELECT
        b.id AS bookingId, b.FromDate, b.ToDate, b.Status AS bookingStatus, b.userEmail,
        v.VehiclesTitle, v.PricePerDay, v.RegistrationPlate, br.BrandName,
        u.FullName, u.Address, u.City, u.Country, u.ContactNo,
        p.id AS paymentId, p.amount, p.payment_method, p.transaction_id,
        p.gateway, p.gateway_order_id, p.gateway_payment_id, p.payment_status, p.payment_date
      FROM tblbooking b
      JOIN tblvehicles v ON v.id = b.VehicleId
      LEFT JOIN tblbrands br ON br.id = v.VehiclesBrand
      LEFT JOIN tblusers u ON u.EmailId = b.userEmail
      LEFT JOIN tblpayments p ON p.booking_id = b.id
      WHERE b.id = ?
      ORDER BY p.id DESC
      LIMIT 1
    `, [bookingId]);

    if (rows.length === 0) throw new NotFoundError('Booking or Payment');
    const row = rows[0];

    let days = 1;
    let computedTotal = Number(row.PricePerDay || 0);
    try {
      if (row.FromDate && row.ToDate) {
        const calc = computeRentalAmount(row.FromDate, row.ToDate, row.PricePerDay || 0);
        days = calc.days;
        computedTotal = Number(calc.totalAmount || 0);
      }
    } catch {}

    const grossAmount = Number(row.amount || computedTotal || 0);
    // Treat total settled amount as GST-inclusive (18% GST: 9% CGST + 9% SGST)
    const taxableValue = Number((grossAmount / 1.18).toFixed(2));
    const totalGst = Number((grossAmount - taxableValue).toFixed(2));
    const cgstAmount = Number((totalGst / 2).toFixed(2));
    const sgstAmount = Number((totalGst - cgstAmount).toFixed(2));

    return {
      invoiceNumber: `INV-WW-${String(row.bookingId).padStart(6, '0')}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      supplier: {
        legalName: 'WanderWheels Mobility Services Pvt. Ltd.',
        gstin: '27AAACW9999F1Z5',
        sacCode: '996601',
        address: '100 Business Park, Suite 400, Pune, Maharashtra, India',
      },
      customer: {
        name: row.FullName || row.userEmail,
        email: row.userEmail,
        phone: row.ContactNo || '-',
        address: [row.Address, row.City, row.Country].filter(Boolean).join(', ') || 'Pune, India',
      },
      rental: {
        bookingId: row.bookingId,
        vehicle: row.BrandName ? `${row.BrandName} ${row.VehiclesTitle}` : row.VehiclesTitle,
        registrationPlate: row.RegistrationPlate || `MH 12 WW ${String(row.bookingId).padStart(4, '0')}`,
        fromDate: row.FromDate,
        toDate: row.ToDate,
        durationDays: days,
        ratePerDay: Number(row.PricePerDay || 0),
      },
      tax: {
        taxableValue,
        cgstRate: 9,
        cgstAmount,
        sgstRate: 9,
        sgstAmount,
        totalGst,
        grandTotal: grossAmount,
      },
      payment: {
        status: row.payment_status || 'pending',
        gateway: row.gateway || 'manual',
        method: row.payment_method || '-',
        orderId: row.gateway_order_id || '-',
        transactionId: row.gateway_payment_id || row.transaction_id || '-',
        paymentDate: row.payment_date,
      },
    };
  }
}

module.exports = new FleetOpsService();
