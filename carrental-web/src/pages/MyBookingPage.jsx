import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import client, { getVehicleImageUrl } from '../api/client';
import PaymentModal from '../components/PaymentModal';

export default function MyBookingPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState(null);

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
                        const isConfirmedBooking = booking.Status === 1;
                        const isPaymentConfirmed = booking.payment_status === 'confirmed';

                        return (
                          <li key={bookingId} data-booking-id={bookingId}>
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
                              {isConfirmedBooking ? (
                                <>
                                  <a href="#" onClick={(e) => e.preventDefault()} className="btn outline btn-xs active-btn">
                                    Confirmed
                                  </a>
                                  <div className="payment_status" style={{ marginTop: '10px' }}>
                                    {isPaymentConfirmed ? (
                                      <>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}>
                                          <b>Payment Status:</b> <span style={{ color: '#5cb85c', fontWeight: 'bold' }}>Confirmed</span>
                                        </p>
                                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                          <b>Method:</b> {booking.payment_method || 'Online'}
                                        </p>
                                        <p style={{ margin: '4px 0', fontSize: '12px' }}>
                                          <b>Ref ID:</b> {booking.gateway_payment_id || booking.transaction_id || 'N/A'}
                                        </p>
                                        <Link
                                          to={`/receipt/${bookingId}`}
                                          className="btn btn-xs btn-success"
                                          target="_blank"
                                          style={{ marginTop: '6px' }}
                                        >
                                          Download Receipt
                                        </Link>
                                      </>
                                    ) : (
                                      <>
                                        {booking.payment_status === 'failed' && (
                                          <div className="alert alert-danger" style={{ padding: '4px 8px', fontSize: '11px', marginBottom: '6px' }}>
                                            Payment failed. You can try again.
                                          </div>
                                        )}
                                        {booking.payment_status === 'pending' && (
                                          <p style={{ fontSize: '12px', color: '#8a6d3b', margin: '4px 0' }}>
                                            <b>Status:</b> Pending payment
                                          </p>
                                        )}
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-xs"
                                          onClick={() => setSelectedBookingForPayment(booking)}
                                          style={{ marginTop: '4px' }}
                                        >
                                          {booking.payment_status === 'failed' ? 'Retry Payment' : 'Pay now'}
                                        </button>
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
                            <div style={{ float: 'left', marginTop: '6px' }}>
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

      {/* Online Payment Modal */}
      {selectedBookingForPayment && (
        <PaymentModal
          booking={selectedBookingForPayment}
          onClose={() => setSelectedBookingForPayment(null)}
          onSuccess={() => {
            loadBookings();
          }}
        />
      )}

      <Footer />
    </>
  );
}