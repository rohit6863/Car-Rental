import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Printer, IndianRupee, Clock, FileCheck2 } from 'lucide-react';
import client from '../api/client';
import AdminModal from '../components/AdminModal';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../context/ToastContext';

export default function AdminManagePaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);

  const { searchQuery } = useSearch();
  const { showToast } = useToast();

  const loadPayments = async () => {
    try {
      const res = await client.get('/api/admin/payments');
      setPayments(res.data);
    } catch {
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      [p.booking_id, p.FullName, p.VehiclesTitle, p.gateway, p.gateway_order_id, p.gateway_payment_id, p.transaction_id, p.payment_status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [payments, searchQuery]);

  const summary = useMemo(() => {
    let settled = 0;
    let pending = 0;
    for (const p of payments) {
      const amt = Number(p.amount) || 0;
      if (p.payment_status === 'confirmed') settled += amt;
      else if (p.payment_status === 'pending' || p.payment_status === 'needs_refund') pending += amt;
    }
    const gst = Math.round(settled - settled / 1.18);
    return { settled, pending, gst };
  }, [payments]);

  const handleConfirm = async (id) => {
    if (!window.confirm('Do you want to confirm this payment?')) return;
    setError('');
    setMsg('');
    setActionInProgress(id);
    try {
      const res = await client.patch(`/api/admin/payments/${id}/confirm`);
      setMsg(res.data.message || 'Payment Confirmed Successfully');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to confirm payment';
      setError(errorMsg);
    } finally {
      await loadPayments();
      setActionInProgress(null);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Do you want to reject this payment?')) return;
    setError('');
    setMsg('');
    setActionInProgress(id);
    try {
      const res = await client.patch(`/api/admin/payments/${id}/reject`);
      setMsg(res.data.message || 'Payment Rejected Successfully');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to reject payment';
      setError(errorMsg);
    } finally {
      await loadPayments();
      setActionInProgress(null);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleReconcile = async (id) => {
    setError('');
    setMsg('');
    setActionInProgress(id);
    try {
      const res = await client.post(`/api/admin/payments/reconcile/${id}`);
      setMsg(res.data.message || 'Payment Reconciled');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to reconcile payment';
      setError(errorMsg);
    } finally {
      await loadPayments();
      setActionInProgress(null);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleOpenInvoice = async (bookingId) => {
    setInvoiceModalOpen(true);
    setInvoiceLoading(true);
    setInvoiceData(null);
    try {
      const res = await client.get(`/api/admin/payments/${bookingId}/invoice`);
      setInvoiceData(res.data);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to generate GST invoice';
      showToast(errMsg, 'rose');
      setInvoiceModalOpen(false);
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 dark:text-white tracking-tight">Manage Payments</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Monitor gateway settlements, reconcile pending transactions, manage approvals, and issue GST invoices
        </p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Settled Rental Volume
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              Rs. {summary.settled.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending / Escrow Volume
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              Rs. {summary.pending.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bento-card p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              GST Collected (18%)
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              Rs. {summary.gst.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-lavender-50 dark:bg-indigo-950/60 text-lavender-600 dark:text-indigo-400 flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Payment Details</span>
          <span className="text-xs text-slate-400 tabular-nums">{filteredPayments.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading payments...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-hairline dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-3 font-semibold">#</th>
                  <th className="px-3.5 py-3 font-semibold">Booking ID</th>
                  <th className="px-3.5 py-3 font-semibold">User</th>
                  <th className="px-3.5 py-3 font-semibold">Vehicle</th>
                  <th className="px-3.5 py-3 font-semibold">Amount</th>
                  <th className="px-3.5 py-3 font-semibold">Gateway</th>
                  <th className="px-3.5 py-3 font-semibold">Order ID</th>
                  <th className="px-3.5 py-3 font-semibold">Payment ID</th>
                  <th className="px-3.5 py-3 font-semibold">Method</th>
                  <th className="px-3.5 py-3 font-semibold">Payment Date</th>
                  <th className="px-3.5 py-3 font-semibold">Status</th>
                  <th className="px-3.5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-slate-800">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p, idx) => {
                    const isAutomated = p.gateway && p.gateway !== 'manual';
                    const gatewayName = p.gateway
                      ? p.gateway.charAt(0).toUpperCase() + p.gateway.slice(1)
                      : 'Manual';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-3 tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</td>
                        <td className="px-3.5 py-3 tabular-nums font-semibold text-slate-900 dark:text-white">{p.booking_id}</td>
                        <td className="px-3.5 py-3 text-slate-800 dark:text-slate-200">{p.FullName}</td>
                        <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300">{p.VehiclesTitle}</td>
                        <td className="px-3.5 py-3 font-semibold text-slate-900 dark:text-white tabular-nums">Rs. {p.amount}</td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`label px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              isAutomated
                                ? 'label-info bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                                : 'label-default bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {gatewayName}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {p.gateway_order_id || '-'}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {p.gateway_payment_id || p.transaction_id || '-'}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">{p.payment_method || '-'}</td>
                        <td className="px-3.5 py-3 tabular-nums text-slate-500 dark:text-slate-400">
                          {p.payment_date ? new Date(p.payment_date).toLocaleString() : ''}
                        </td>
                        <td className="px-3.5 py-3">
                          {p.payment_status === 'needs_refund' ? (
                            <div>
                              <span className="label label-danger inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                                Needs Refund
                              </span>
                              {p.failure_reason && (
                                <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{p.failure_reason}</div>
                              )}
                            </div>
                          ) : p.payment_status === 'confirmed' ? (
                            <span className="label label-success inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                              Confirmed
                            </span>
                          ) : p.payment_status === 'failed' ? (
                            <div>
                              <span className="label label-default inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                Failed
                              </span>
                              {p.failure_reason && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{p.failure_reason}</div>
                              )}
                            </div>
                          ) : (
                            <span className="capitalize font-semibold text-amber-700 dark:text-amber-300">{p.payment_status}</span>
                          )}
                          {p.booking_status === 2 && p.payment_status !== 'needs_refund' && (
                            <div className="mt-1">
                              <span className="label label-warning inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                Booking Cancelled
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {actionInProgress === p.id ? (
                              <span className="text-slate-400">Processing...</span>
                            ) : isAutomated ? (
                              p.payment_status === 'pending' ? (
                                <a
                                  href="#reconcile"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleReconcile(p.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-lavender-50 dark:bg-indigo-950/60 text-lavender-600 dark:text-indigo-300 hover:bg-lavender-100 dark:hover:bg-indigo-900/60 font-semibold no-underline"
                                >
                                  Reconcile
                                </a>
                              ) : (
                                <span className="text-slate-400">Automated</span>
                              )
                            ) : p.payment_status === 'pending' ? (
                              <>
                                <a
                                  href="#confirm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleConfirm(p.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold no-underline"
                                >
                                  Confirm
                                </a>
                                <a
                                  href="#reject"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleReject(p.id);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 font-semibold no-underline"
                                >
                                  Reject
                                </a>
                              </>
                            ) : (
                              <span className="capitalize text-slate-500 dark:text-slate-400">{p.payment_status}</span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenInvoice(p.booking_id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-hairline dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold transition cursor-pointer"
                              title="View / Print GST Tax Invoice"
                            >
                              <Receipt className="w-3 h-3" />
                              <span>GST Invoice</span>
                            </button>
                          </div>
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
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title={invoiceData ? `Tax Invoice ${invoiceData.invoiceNumber}` : 'GST Tax Invoice'}
        subtitle="WanderWheels Fleet Tax Invoice (SAC 996601)"
        maxWidth="max-w-2xl"
        className="gst-invoice-printable"
      >
        {invoiceLoading || !invoiceData ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Generating tax invoice...</p>
        ) : (
          <div className="space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-hairline dark:border-slate-800">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{invoiceData.supplier?.legalName}</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">{invoiceData.supplier?.address}</div>
                <div className="text-slate-600 dark:text-slate-300 font-mono mt-1">
                  GSTIN: {invoiceData.supplier?.gstin} &bull; SAC: {invoiceData.supplier?.sacCode}
                </div>
              </div>
              <div className="sm:text-right">
                <div className="font-mono font-bold text-lavender-600 dark:text-indigo-400 text-sm">
                  {invoiceData.invoiceNumber}
                </div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  Date: {invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate).toLocaleDateString() : '-'}
                </div>
                <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                  Booking #{invoiceData.rental?.bookingId}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-hairline dark:border-slate-700 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billed To</div>
                <div className="font-semibold text-slate-900 dark:text-white">{invoiceData.customer?.name}</div>
                <div className="text-slate-600 dark:text-slate-300">{invoiceData.customer?.email}</div>
                <div className="text-slate-600 dark:text-slate-300">{invoiceData.customer?.phone || '-'}</div>
                <div className="text-slate-500 dark:text-slate-400">{invoiceData.customer?.address || '-'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-hairline dark:border-slate-700 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rental Details</div>
                <div className="font-semibold text-slate-900 dark:text-white">{invoiceData.rental?.vehicle}</div>
                <div className="font-mono text-slate-600 dark:text-slate-300">
                  Plate: {invoiceData.rental?.registrationPlate || 'Unassigned'}
                </div>
                <div className="text-slate-600 dark:text-slate-300 tabular-nums">
                  {invoiceData.rental?.fromDate} to {invoiceData.rental?.toDate} ({invoiceData.rental?.durationDays} days)
                </div>
                <div className="text-slate-500 dark:text-slate-400 tabular-nums">
                  Rate: Rs. {invoiceData.rental?.ratePerDay}/day
                </div>
              </div>
            </div>

            <div className="border border-hairline dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Tax Breakdown</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline dark:divide-slate-800">
                  <tr>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">Taxable Rental Value</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                      Rs. {Number(invoiceData.tax?.taxableValue || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      CGST ({invoiceData.tax?.cgstRate || 9}%)
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                      Rs. {Number(invoiceData.tax?.cgstAmount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      SGST ({invoiceData.tax?.sgstRate || 9}%)
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                      Rs. {Number(invoiceData.tax?.sgstAmount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold">
                    <td className="px-4 py-3 text-slate-900 dark:text-white">Grand Total (Incl. GST)</td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm text-lavender-600 dark:text-indigo-400">
                      Rs. {Number(invoiceData.tax?.grandTotal || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Gateway: {invoiceData.payment?.gateway || 'manual'} &bull; Txn: {invoiceData.payment?.transactionId || '-'}
              </div>
              <div className="no-print flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Tax Invoice</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
