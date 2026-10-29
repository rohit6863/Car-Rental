'use strict';
/**
 * Date utilities.
 * ALL day-count logic uses INCLUSIVE counting: both start and end dates count.
 * Formula: days = end - start + 1
 *
 * This matches the Flatpickr booking form (which uses +1) and ensures
 * the booking form, my-bookings page, and receipt always show the same total.
 */

/**
 * Parse a date string to a Date object at midnight UTC.
 * Accepts 'yyyy-mm-dd'.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${dateStr}`);
  return d;
}

/**
 * Count the number of rental days (INCLUSIVE of both endpoints).
 * @param {string} fromDate  'yyyy-mm-dd'
 * @param {string} toDate    'yyyy-mm-dd'
 * @returns {number}
 */
function countDaysInclusive(fromDate, toDate) {
  const start = parseDate(fromDate);
  const end   = parseDate(toDate);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) throw new Error('toDate must be >= fromDate');
  return Math.round(diffMs / 86400000) + 1;
}

/**
 * Compute the total rental amount server-side.
 * @param {string} fromDate
 * @param {string} toDate
 * @param {number} pricePerDay  (in rupees)
 * @returns {{ days: number, totalAmount: number }}
 */
function computeRentalAmount(fromDate, toDate, pricePerDay) {
  const days = countDaysInclusive(fromDate, toDate);
  return { days, totalAmount: days * pricePerDay };
}

/**
 * Format a Date to 'yyyy-mm-dd'.
 * @param {Date} d
 */
function toISODateString(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Expand a date range into individual 'yyyy-mm-dd' strings (inclusive).
 * Used by get_booked_dates logic.
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {string[]}
 */
function expandDateRange(fromDate, toDate) {
  const dates = [];
  const cur = parseDate(fromDate);
  const end = parseDate(toDate);
  while (cur <= end) {
    dates.push(toISODateString(new Date(cur)));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Validate that fromDate < toDate (strict — same day not allowed).
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {boolean}
 */
function isValidDateRange(fromDate, toDate) {
  try {
    const start = parseDate(fromDate);
    const end   = parseDate(toDate);
    return end > start;
  } catch {
    return false;
  }
}

module.exports = {
  parseDate,
  countDaysInclusive,
  computeRentalAmount,
  toISODateString,
  expandDateRange,
  isValidDateRange,
};
