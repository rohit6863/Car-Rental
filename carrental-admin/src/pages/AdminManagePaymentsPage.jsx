import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminManagePaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Manage Payments</h2>
        <p className="text-xs text-slate-500 mt-0.5">Monitor gateway settlements, reconcile pending transactions, and manage manual approvals</p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">Payment Details</span>
          <span className="text-xs text-slate-400 tabular-nums">{payments.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading payments...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider border-b border-hairline">
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
              <tbody className="divide-y divide-hairline">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map((p, idx) => {
                    const isAutomated = p.gateway && p.gateway !== 'manual';
                    const gatewayName = p.gateway
                      ? p.gateway.charAt(0).toUpperCase() + p.gateway.slice(1)
                      : 'Manual';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-3 tabular-nums text-slate-500">{idx + 1}</td>
                        <td className="px-3.5 py-3 tabular-nums font-semibold text-slate-900">{p.booking_id}</td>
                        <td className="px-3.5 py-3 text-slate-800">{p.FullName}</td>
                        <td className="px-3.5 py-3 text-slate-700">{p.VehiclesTitle}</td>
                        <td className="px-3.5 py-3 font-semibold text-slate-900 tabular-nums">Rs. {p.amount}</td>
                        <td className="px-3.5 py-3">
                          <span
                            className={`label px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              isAutomated
                                ? 'label-info bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'label-default bg-slate-100 text-slate-700'
                            }`}
                          >
                            {gatewayName}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-500">
                          {p.gateway_order_id || '-'}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-500">
                          {p.gateway_payment_id || p.transaction_id || '-'}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600">{p.payment_method || '-'}</td>
                        <td className="px-3.5 py-3 tabular-nums text-slate-500">
                          {p.payment_date ? new Date(p.payment_date).toLocaleString() : ''}
                        </td>
                        <td className="px-3.5 py-3">
                          {p.payment_status === 'needs_refund' ? (
                            <div>
                              <span className="label label-danger inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Needs Refund
                              </span>
                              {p.failure_reason && (
                                <div className="text-[11px] text-rose-600 mt-1">{p.failure_reason}</div>
                              )}
                            </div>
                          ) : p.payment_status === 'confirmed' ? (
                            <span className="label label-success inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Confirmed
                            </span>
                          ) : p.payment_status === 'failed' ? (
                            <div>
                              <span className="label label-default inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Failed
                              </span>
                              {p.failure_reason && (
                                <div className="text-[11px] text-slate-500 mt-1">{p.failure_reason}</div>
                              )}
                            </div>
                          ) : (
                            <span className="capitalize font-semibold text-amber-700">{p.payment_status}</span>
                          )}
                          {p.booking_status === 2 && p.payment_status !== 'needs_refund' && (
                            <div className="mt-1">
                              <span className="label label-warning inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Booking Cancelled
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
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
                                className="px-2.5 py-1 rounded-lg bg-lavender-50 text-lavender-600 hover:bg-lavender-100 font-semibold no-underline"
                              >
                                Reconcile
                              </a>
                            ) : (
                              <span className="text-slate-400">Automated</span>
                            )
                          ) : p.payment_status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <a
                                href="#confirm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleConfirm(p.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold no-underline"
                              >
                                Confirm
                              </a>
                              <a
                                href="#reject"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleReject(p.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold no-underline"
                              >
                                Reject
                              </a>
                            </div>
                          ) : (
                            <span className="capitalize text-slate-500">{p.payment_status}</span>
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
    </div>
  );
}
