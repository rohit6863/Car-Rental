import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CornerDownLeft, CheckCircle2 } from 'lucide-react';
import client from '../api/client';
import AdminModal from '../components/AdminModal';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../context/ToastContext';

function toLocalDateTimeInput(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminManageBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  const [returningBooking, setReturningBooking] = useState(null);
  const [returnedAt, setReturnedAt] = useState('');
  const [returnOdometer, setReturnOdometer] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const { searchQuery } = useSearch();
  const { showToast } = useToast();

  const loadBookings = async () => {
    try {
      const res = await client.get('/api/admin/bookings');
      setBookings(res.data);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [b.FullName, b.BrandName, b.VehiclesTitle, b.FromDate, b.ToDate, b.message]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [bookings, searchQuery]);

  const handleConfirm = async (id) => {
    if (!window.confirm('Confirm this booking?')) return;
    setError('');
    setMsg('');
    setActionInProgress(id);
    try {
      const res = await client.patch(`/api/admin/bookings/${id}/confirm`);
      setMsg(res.data.message || 'Booking Confirmed and Vehicle Marked as Rented');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Cannot confirm booking: a conflict occurred';
      setError(errorMsg);
    } finally {
      await loadBookings();
      setActionInProgress(null);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    setError('');
    setMsg('');
    setActionInProgress(id);
    try {
      const res = await client.patch(`/api/admin/bookings/${id}/cancel`);
      setMsg(res.data.message || 'Booking Cancelled and Vehicle Marked as Available');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Cannot cancel booking';
      setError(errorMsg);
    } finally {
      await loadBookings();
      setActionInProgress(null);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const openReturnModal = (booking) => {
    setReturningBooking(booking);
    setReturnedAt(toLocalDateTimeInput(new Date()));
    setReturnOdometer('');
    setReturnNotes('');
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!returningBooking) return;
    setError('');
    setMsg('');
    setReturnSubmitting(true);
    try {
      const payload = {
        returnedAt: returnedAt ? new Date(returnedAt).toISOString() : undefined,
        returnOdometerKm: returnOdometer !== '' ? Number(returnOdometer) : null,
        returnNotes: returnNotes.trim() || null,
      };
      const res = await client.patch(`/api/admin/bookings/${returningBooking.id}/return`, payload);
      const successMsg = res.data.message || 'Vehicle return confirmed and marked Available';
      setMsg(successMsg);
      showToast(successMsg, 'emerald');
      setReturningBooking(null);
      await loadBookings();
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to confirm vehicle return';
      setError(errorMsg);
      showToast(errorMsg, 'rose');
    } finally {
      setReturnSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Manage Bookings</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Approve pending reservations, confirm vehicle returns, resolve date conflicts, or cancel bookings
        </p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline dark:border-[#27272A] flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">Booking Details</span>
          <span className="text-xs text-slate-400 dark:text-zinc-400 tabular-nums">{filteredBookings.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-zinc-400">Loading bookings...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#1C1C1F] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-hairline dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">From Date</th>
                  <th className="px-4 py-3 font-semibold">To Date</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Posting Date</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-[#27272A]">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b, idx) => {
                    const isReturned = Boolean(b.ReturnedAt);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1C1C1F]/70">
                        <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-zinc-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-zinc-100">{b.FullName}</td>
                        <td className="px-4 py-3">
                          <Link to={`/edit-vehicle/${b.vid}`} className="text-lavender-600 dark:text-amber-400 hover:underline font-medium no-underline">
                            {b.BrandName}, {b.VehiclesTitle}
                          </Link>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-zinc-300">{b.FromDate}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-zinc-300">{b.ToDate}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-zinc-300 max-w-[200px] truncate">{b.message}</td>
                        <td className="px-4 py-3">
                          {b.Status === 0 && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                              Not Confirmed
                            </span>
                          )}
                          {b.Status === 1 && !isReturned && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                              Confirmed
                            </span>
                          )}
                          {b.Status === 1 && isReturned && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Returned
                              </span>
                              <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 tabular-nums">
                                Returned: {new Date(b.ReturnedAt).toLocaleString()}
                              </div>
                            </div>
                          )}
                          {b.Status === 2 && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30">
                              Cancelled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-zinc-400">
                          {b.PostingDate ? new Date(b.PostingDate).toLocaleString() : ''}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {actionInProgress === b.id ? (
                            <span className="text-slate-400">Processing...</span>
                          ) : isReturned ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Returned</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              {b.Status === 0 && (
                                <a
                                  href="#confirm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleConfirm(b.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 font-semibold no-underline"
                                >
                                  Confirm
                                </a>
                              )}
                              {b.Status === 1 && !isReturned && (
                                <button
                                  type="button"
                                  onClick={() => openReturnModal(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-amber-500/15 text-indigo-700 dark:text-amber-400 hover:bg-indigo-100 dark:hover:bg-amber-500/25 font-semibold cursor-pointer"
                                >
                                  <CornerDownLeft className="w-3 h-3" />
                                  <span>Mark Returned</span>
                                </button>
                              )}
                              {b.Status !== 2 && !isReturned && (
                                <a
                                  href="#cancel"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCancel(b.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-100 font-semibold no-underline"
                                >
                                  Cancel
                                </a>
                              )}
                              {b.Status === 2 && <span className="text-slate-400">Cancelled</span>}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminModal
        isOpen={Boolean(returningBooking)}
        onClose={() => setReturningBooking(null)}
        title="Confirm Vehicle Return"
        subtitle={returningBooking ? `Booking #${returningBooking.id} — ${returningBooking.BrandName} ${returningBooking.VehiclesTitle}` : ''}
        maxWidth="max-w-md"
      >
        {returningBooking && (
          <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1C1C1F] border border-hairline dark:border-[#27272A] space-y-1">
              <div className="font-bold text-slate-900 dark:text-zinc-100">{returningBooking.FullName}</div>
              <div className="text-slate-500 dark:text-zinc-400 tabular-nums">
                Rental Period: {returningBooking.FromDate} to {returningBooking.ToDate}
              </div>
            </div>

            <div>
              <label
                htmlFor="return-datetime"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
              >
                Return Date &amp; Time *
              </label>
              <input
                id="return-datetime"
                type="datetime-local"
                value={returnedAt}
                onChange={(e) => setReturnedAt(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-hairline dark:border-[#27272A] bg-white dark:bg-[#1C1C1F] text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-lavender-600 dark:focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="return-odometer"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
              >
                Return Odometer (km, optional)
              </label>
              <input
                id="return-odometer"
                type="number"
                min="0"
                value={returnOdometer}
                onChange={(e) => setReturnOdometer(e.target.value)}
                placeholder="e.g. 14250"
                className="w-full px-3.5 py-2.5 rounded-xl border border-hairline dark:border-[#27272A] bg-white dark:bg-[#1C1C1F] text-slate-900 dark:text-zinc-100 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-lavender-600 dark:focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="return-notes"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
              >
                Return Inspection Notes (optional)
              </label>
              <textarea
                id="return-notes"
                rows={3}
                maxLength={255}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Clean exterior, full tank, zero scratches..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-hairline dark:border-[#27272A] bg-white dark:bg-[#1C1C1F] text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-600 dark:focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline dark:border-[#27272A]">
              <button
                type="button"
                onClick={() => setReturningBooking(null)}
                className="px-4 py-2 rounded-xl border border-hairline dark:border-[#27272A] text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1C1C1F] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={returnSubmitting}
                className="px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-bold transition cursor-pointer disabled:opacity-60"
              >
                {returnSubmitting ? 'Confirming...' : 'Confirm Return'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>
    </div>
  );
}
