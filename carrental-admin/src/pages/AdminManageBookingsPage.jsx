import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function AdminManageBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);

  const loadBookings = async () => {
    try {
      const res = await client.get('/api/admin/bookings');
      setBookings(res.data);
    } catch (err) {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

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

  return (
    <div className="row">
      <div className="col-md-12">
        <h2 className="page-title">Manage Bookings</h2>

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
          <div className="panel-heading">Booking Details</div>
          <div className="panel-body">
            {loading ? (
              <p>Loading bookings...</p>
            ) : (
              <table id="zctb" className="display table table-striped table-bordered table-hover" cellSpacing="0" width="100%">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Vehicle</th>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th>Posting Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center">No bookings found</td>
                    </tr>
                  ) : (
                    bookings.map((b, idx) => (
                      <tr key={b.id}>
                        <td>{idx + 1}</td>
                        <td>{b.FullName}</td>
                        <td>
                          <Link to={`/edit-vehicle/${b.vid}`}>
                            {b.BrandName}, {b.VehiclesTitle}
                          </Link>
                        </td>
                        <td>{b.FromDate}</td>
                        <td>{b.ToDate}</td>
                        <td>{b.message}</td>
                        <td>
                          {b.Status === 0 && 'Not Confirmed'}
                          {b.Status === 1 && 'Confirmed'}
                          {b.Status === 2 && 'Cancelled'}
                        </td>
                        <td>{b.PostingDate ? new Date(b.PostingDate).toLocaleString() : ''}</td>
                        <td>
                          {actionInProgress === b.id ? (
                            <span>Processing...</span>
                          ) : (
                            <>
                              {b.Status === 0 && (
                                <>
                                  <a
                                    href="#confirm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleConfirm(b.id);
                                    }}
                                  >
                                    Confirm
                                  </a>
                                  {' / '}
                                </>
                              )}
                              {b.Status !== 2 && (
                                <a
                                  href="#cancel"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleCancel(b.id);
                                  }}
                                  style={{ color: '#dd3d36' }}
                                >
                                  Cancel
                                </a>
                              )}
                              {b.Status === 2 && (
                                <span style={{ color: '#888' }}>Cancelled</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))
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
