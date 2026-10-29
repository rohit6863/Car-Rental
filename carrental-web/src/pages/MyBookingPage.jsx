import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import client, { getVehicleImageUrl } from '../api/client';

export default function MyBookingPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForUpi, setSelectedBookingForUpi] = useState(null);
  const [paymentForms, setPaymentForms] = useState({});
  const [paymentSubmitting, setPaymentSubmitting] = useState({});
  const [paymentError, setPaymentError] = useState({});
  const [paymentSuccess, setPaymentSuccess] = useState({});

  const loadBookings = async () => {
    try {
      const res = await client.get('/api/bookings/my');
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleMethodChange = (bookingId, method, totalAmount) => {
    setPaymentForms(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        payment_method: method
      }
    }));

    if (method === 'UPI') {
      setSelectedBookingForUpi({ id: bookingId, amount: totalAmount });
      if (window.$) {
        window.$('#upiModal').modal('show');
      }
    }
  };

  const handleTransactionChange = (bookingId, txId) => {
    setPaymentForms(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        transaction_id: txId
      }
    }));
  };

  const handlePaymentSubmit = async (e, bookingId) => {
    e.preventDefault();
    const form = paymentForms[bookingId];
    if (!form || !form.payment_method || !form.transaction_id) {
      setPaymentError(prev => ({ ...prev, [bookingId]: 'Please select a method and enter transaction ID' }));
      return;
    }

    setPaymentSubmitting(prev => ({ ...prev, [bookingId]: true }));
    setPaymentError(prev => ({ ...prev, [bookingId]: '' }));
    setPaymentSuccess(prev => ({ ...prev, [bookingId]: '' }));

    try {
      await client.post('/api/payments', {
        booking_id: bookingId,
        payment_method: form.payment_method,
        transaction_id: form.transaction_id
      });
      setPaymentSuccess(prev => ({ ...prev, [bookingId]: 'Payment submitted successfully! Waiting for admin confirmation.' }));
      await loadBookings();
    } catch (err) {
      setPaymentError(prev => ({
        ...prev,
        [bookingId]: err.response?.data?.message || err.response?.data?.error || 'Failed to submit payment'
      }));
    } finally {
      setPaymentSubmitting(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  return (
    <>
      <Header />

      {/* Page Header */}
      <section className="page-header profile_page">
        <div className="container">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1>My Booking</h1>
            </div>
            <ul className="coustom-breadcrumb">
              <li><Link to="/">Home</Link></li>
              <li>My Booking</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      {/* User Profile Info */}
      <section className="user_profile inner_pages">
        <div className="container">
          <div className="user_profile_info gray-bg padding_4x4_40">
            <div className="upload_user_logo">
              <img src="/assets/images/dealer-logo.jpg" alt="image" />
            </div>
            <div className="dealer_info">
              <h5>{user?.FullName}</h5>
              <p>
                {user?.Address}<br />
                {user?.City}&nbsp;{user?.Country}
              </p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-3 col-sm-3">
              <Sidebar active="my-booking" />
            </div>

            <div className="col-md-9 col-sm-9">
              <div className="profile_wrap">
                <h5 className="uppercase underline">My Bookings </h5>
                <div className="my_vehicles_list">
                  <ul className="vehicle_listing">
                    {loading ? (
                      <p>Loading bookings...</p>
                    ) : bookings.length === 0 ? (
                      <p>You have not made any bookings yet.</p>
                    ) : (
                      bookings.map((booking) => {
                        const bookingId = booking.id || booking.bookingId;
                        const currentForm = paymentForms[bookingId] || {};
                        const showTxFields = !!currentForm.payment_method;

                        return (
                          <li key={bookingId}>
                            <div className="vehicle_img">
                              <Link to={`/vehical-details/${booking.vid}`}>
                                <img src={getVehicleImageUrl(booking.Vimage1)} alt="image" />
                              </Link>
                            </div>
                            <div className="vehicle_title">
                              <h6>
                                <Link to={`/vehical-details/${booking.vid}`}>
                                  {booking.BrandName} , {booking.VehiclesTitle}
                                </Link>
                              </h6>
                              <p>
                                <b>From Date:</b> {booking.FromDate}<br />
                                <b>To Date:</b> {booking.ToDate}<br />
                                <b>Total Amount:</b> Rs. {booking.totalAmount}
                              </p>
                            </div>
                            <div className="vehicle_status">
                              {booking.Status === 1 ? (
                                <>
                                  <a href="#" onClick={(e) => e.preventDefault()} className="btn outline btn-xs active-btn">Confirmed</a>
                                  <div className="payment_status" style={{ marginTop: '10px' }}>
                                    {(!booking.payment_status || booking.payment_status === 'unpaid') ? (
                                      <form onSubmit={(e) => handlePaymentSubmit(e, bookingId)}>
                                        {paymentError[bookingId] && (
                                          <div className="alert alert-danger" style={{ padding: '6px 10px', fontSize: '12px' }}>
                                            {paymentError[bookingId]}
                                          </div>
                                        )}
                                        {paymentSuccess[bookingId] && (
                                          <div className="alert alert-success" style={{ padding: '6px 10px', fontSize: '12px' }}>
                                            {paymentSuccess[bookingId]}
                                          </div>
                                        )}
                                        <div className="form-group" style={{ marginBottom: '10px' }}>
                                          <select
                                            name="payment_method"
                                            className="form-control"
                                            value={currentForm.payment_method || ''}
                                            onChange={(e) => handleMethodChange(bookingId, e.target.value, booking.totalAmount)}
                                            required
                                          >
                                            <option value="">Select Payment Method</option>
                                            <option value="Credit Card">Credit Card</option>
                                            <option value="Debit Card">Debit Card</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="UPI">UPI Payment</option>
                                          </select>
                                        </div>
                                        {showTxFields && (
                                          <div>
                                            <div className="form-group">
                                              <input
                                                type="text"
                                                name="transaction_id"
                                                className="form-control"
                                                placeholder="Enter Transaction/Reference ID"
                                                value={currentForm.transaction_id || ''}
                                                onChange={(e) => handleTransactionChange(bookingId, e.target.value)}
                                                required
                                              />
                                            </div>
                                            <button
                                              type="submit"
                                              className="btn btn-primary btn-block"
                                              disabled={paymentSubmitting[bookingId]}
                                            >
                                              {paymentSubmitting[bookingId] ? 'Submitting...' : 'Submit Payment'}
                                            </button>
                                          </div>
                                        )}
                                      </form>
                                    ) : (
                                      <>
                                        <p>
                                          <b>Payment Status:</b> {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                                        </p>
                                        {booking.payment_status === 'confirmed' && (
                                          <>
                                            <p><b>Payment Method:</b> {booking.payment_method}</p>
                                            <p><b>Transaction ID:</b> {booking.transaction_id}</p>
                                            <Link
                                              to={`/receipt/${bookingId}`}
                                              className="btn btn-xs btn-success"
                                              target="_blank"
                                            >
                                              Download Receipt
                                            </Link>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </>
                              ) : booking.Status === 2 ? (
                                <a href="#" onClick={(e) => e.preventDefault()} className="btn outline btn-xs">Cancelled</a>
                              ) : (
                                <a href="#" onClick={(e) => e.preventDefault()} className="btn outline btn-xs">Not Confirm yet</a>
                              )}
                              <div className="clearfix"></div>
                            </div>
                            <div style={{ float: 'left' }}>
                              <p><b>Message:</b> {booking.message}</p>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UPI Payment Instructions Modal */}
      <div className="modal fade" id="upiModal" tabIndex="-1" role="dialog" aria-labelledby="upiModalLabel" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
              <h4 className="modal-title" id="upiModalLabel">UPI Payment Instructions</h4>
            </div>
            <div className="modal-body">
              <div className="text-center" style={{ marginBottom: '20px' }}>
                <h5>Amount to Pay: Rs. {selectedBookingForUpi?.amount || 0}</h5>
                <div style={{ marginTop: '15px' }}>
                  <h5>UPI ID:</h5>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>carrental@upi</div>
                </div>
              </div>
              <ol>
                <li>Open your UPI app (Google Pay/PhonePe/BHIM/Paytm)</li>
                <li>Select &apos;Pay by UPI ID/VPA&apos;</li>
                <li>Enter our UPI ID: carrental@upi</li>
                <li>Enter amount: Rs. {selectedBookingForUpi?.amount || 0}</li>
                <li>Complete the payment</li>
                <li>Enter the UPI Transaction ID below to confirm your payment</li>
              </ol>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
