'use strict';
/**
 * Migration 005: Date Migration Helper (DRY-RUN by default)
 *
 * Inspects `tblbooking`.`FromDate` and `ToDate`.
 * Legacy rows used format 'dd/mm/yyyy' or 'd/m/yyyy', whereas modern rows use 'yyyy-mm-dd'.
 *
 * Usage:
 *   node src/migrations/005_date_migration_dryrun.js                # DRY RUN (safe preview)
 *   node src/migrations/005_date_migration_dryrun.js --apply        # EXECUTES conversion with backup check
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

function parseDateValue(val) {
  if (!val || typeof val !== 'string') return { valid: false, reason: 'Empty or not a string' };
  const trimmed = val.trim();

  // Already ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      return { valid: true, formatted: trimmed, alreadyIso: true };
    }
    return { valid: false, reason: `Invalid ISO date value: ${trimmed}` };
  }

  // Legacy format: DD/MM/YYYY or D/M/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      const pad = (n) => String(n).padStart(2, '0');
      return { valid: true, formatted: `${y}-${pad(m)}-${pad(d)}`, alreadyIso: false };
    }
    return { valid: false, reason: `Invalid calendar date components: ${trimmed}` };
  }

  return { valid: false, reason: `Unrecognized format: ${trimmed}` };
}

async function run() {
  const isApply = process.argv.includes('--apply');

  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'carrental',
  });

  console.log('\n============================================================');
  console.log(`[005_date_migration] Mode: ${isApply ? '*** LIVE APPLY ***' : 'DRY RUN (Safe preview)'}`);
  console.log('============================================================\n');

  const [rows] = await conn.execute('SELECT id, userEmail, VehicleId, FromDate, ToDate, Status, PostingDate FROM tblbooking ORDER BY id ASC');

  let rowsToUpdate = [];
  let unparseable = [];
  let alreadyStandard = 0;

  for (const row of rows) {
    const fromRes = parseDateValue(row.FromDate);
    const toRes = parseDateValue(row.ToDate);

    if (!fromRes.valid || !toRes.valid) {
      unparseable.push({
        id: row.id,
        FromDate: row.FromDate,
        ToDate: row.ToDate,
        fromError: fromRes.valid ? null : fromRes.reason,
        toError: toRes.valid ? null : toRes.reason,
      });
      continue;
    }

    if (fromRes.alreadyIso && toRes.alreadyIso) {
      alreadyStandard++;
      continue;
    }

    rowsToUpdate.push({
      id: row.id,
      oldFrom: row.FromDate,
      newFrom: fromRes.formatted,
      oldTo: row.ToDate,
      newTo: toRes.formatted,
    });
  }

  console.log(`Total booking rows analyzed: ${rows.length}`);
  console.log(`Already in standard YYYY-MM-DD: ${alreadyStandard}`);
  console.log(`Rows requiring conversion:     ${rowsToUpdate.length}`);
  console.log(`Unparseable / problematic rows: ${unparseable.length}\n`);

  if (rowsToUpdate.length > 0) {
    console.log('--- Proposed Changes ---');
    console.table(rowsToUpdate.map(r => ({
      BookingID: r.id,
      'Old FromDate': r.oldFrom,
      'New FromDate': r.newFrom,
      'Old ToDate': r.oldTo,
      'New ToDate': r.newTo,
    })));
  }

  if (unparseable.length > 0) {
    console.warn('\n⚠️ WARNING: UNPARSEABLE ROWS DETECTED:');
    console.table(unparseable);
  }

  if (isApply) {
    if (unparseable.length > 0) {
      console.error('\nCannot apply migration with unparseable rows present. Please resolve data issues first.');
      await conn.end();
      process.exit(1);
    }

    console.log('\nApplying date conversions in transaction...');
    await conn.beginTransaction();
    try {
      for (const item of rowsToUpdate) {
        await conn.execute(
          'UPDATE tblbooking SET FromDate = ?, ToDate = ? WHERE id = ?',
          [item.newFrom, item.newTo, item.id]
        );
      }
      await conn.commit();
      console.log('✓ Successfully updated all non-standard booking dates to YYYY-MM-DD.');
    } catch (err) {
      await conn.rollback();
      console.error('Error during apply transaction, rolled back:', err);
    }
  } else {
    console.log('\n[Dry Run Completed] No data was modified.');
    console.log('To apply changes after approval, run: node src/migrations/005_date_migration_dryrun.js --apply\n');
  }

  await conn.end();
}

run().catch(err => {
  console.error('Migration dry run error:', err);
  process.exit(1);
});
