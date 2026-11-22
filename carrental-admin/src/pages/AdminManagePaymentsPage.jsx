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
    } catch (err) {
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
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Manage Payments</h2>

        {error && (
          <div className="errorWrap" style={{
            padding: '10px',
            margin: '0 0 20px 0',
            background: '#fff',
            borderLeft: '4px solid #dd3d36',
            boxShadow: '0 1px 1px 0 rgba(0,0,0,.1)'
          }}>
            <strong>ERROR</strong>: {error}
          </div>
        )}
        {msg && (
          <div className="succWrap" style={{
            padding: '10px',
            margin: '0 0 20px 0',
            background: '#fff',
            borderLeft: '4px solid #5cb85c',
            boxShadow: '0 1px 1px 0 rgba(0,0,0,.1)'
          }}>
            <strong>SUCCESS</strong>: {msg}
          </div>
        )}

        <div className="panel panel-default">
          <div className="panel-heading">Payment Details</div>
          <div className="panel-body" style={{ overflowX: 'auto' }}>
            {loading ? (
              <p>Loading payments...</p>
            ) : (
              <table id="zctb" className="display table table-striped table-bordered table-hover" cellSpacing="0" width="100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Booking ID</th>
                    <th>User</th>
                    <th>Vehicle</th>
                    <th>Amount</th>
                    <th>Gateway</th>
                    <th>Order ID</th>
                    <th>Payment ID</th>
                    <th>Method</th>
                    <th>Payment Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="text-center">No payments found</td>
                    </tr>
                  ) : (
                    payments.map((p, idx) => {
                      const isAutomated = p.gateway && p.gateway !== 'manual';
                      const gatewayName = p.gateway
                        ? (p.gateway.charAt(0).toUpperCase() + p.gateway.slice(1))
                        : 'Manual';

                      return (
                        <tr key={p.id}>
                          <td>{idx + 1}</td>
                          <td>{p.booking_id}</td>
                          <td>{p.FullName}</td>
                          <td>{p.VehiclesTitle}</td>
                          <td>Rs. {p.amount}</td>
                          <td>
                            <span className={`label ${isAutomated ? 'label-info' : 'label-default'}`}>
                              {gatewayName}
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                            {p.gateway_order_id || '-'}
                          </td>
                          <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                            {p.gateway_payment_id || p.transaction_id || '-'}
                          </td>
                          <td>{p.payment_method || '-'}</td>
                          <td>{p.payment_date ? new Date(p.payment_date).toLocaleString() : ''}</td>
                          <td>
                            {p.payment_status === 'needs_refund' ? (
                              <div>
                                <span className="label label-danger" style={{ backgroundColor: '#d9534f', fontSize: '11px', padding: '4px 8px', display: 'inline-block' }}>
                                  Needs Refund
                                </span>
                                {p.failure_reason && (
                                  <div style={{ fontSize: '11px', color: '#c9302c', marginTop: '3px' }}>
                                    {p.failure_reason}
                                  </div>
                                )}
                              </div>
                            ) : p.payment_status === 'confirmed' ? (
                              <span className="label label-success" style={{ backgroundColor: '#5cb85c', fontSize: '11px', padding: '4px 8px' }}>
                                Confirmed
                              </span>
                            ) : p.payment_status === 'failed' ? (
                              <div>
                                <span className="label label-default" style={{ backgroundColor: '#777', fontSize: '11px', padding: '4px 8px' }}>
                                  Failed
                                </span>
                                {p.failure_reason && (
                                  <div style={{ fontSize: '11px', color: '#777', marginTop: '3px' }}>
                                    {p.failure_reason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                                {p.payment_status}
                              </span>
                            )}
                            {p.booking_status === 2 && p.payment_status !== 'needs_refund' && (
                              <div style={{ marginTop: '3px' }}>
                                <span className="label label-warning" style={{ fontSize: '10px' }}>Booking Cancelled</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {actionInProgress === p.id ? (
                              <span>Processing...</span>
                            ) : isAutomated ? (
                              p.payment_status === 'pending' ? (
                                <a
                                  href="#reconcile"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleReconcile(p.id);
                                  }}
                                  className="btn btn-xs btn-primary"
                                >
                                  Reconcile
                                </a>
                              ) : (
                                <span className="text-muted" style={{ fontSize: '12px' }}>
                                  Automated
                                </span>
                              )
                            ) : p.payment_status === 'pending' ? (
                              <>
                                <a
                                  href="#confirm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleConfirm(p.id);
                                  }}
                                >
                                  Confirm
                                </a>
                                {' / '}
                                <a
                                  href="#reject"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleReject(p.id);
                                  }}
                                  style={{ color: '#dd3d36' }}
                                >
                                  Reject
                                </a>
                              </>
                            ) : (
                              <span style={{ textTransform: 'capitalize' }}>
                                {p.payment_status}
                              </span>
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
    </div>
  );
}