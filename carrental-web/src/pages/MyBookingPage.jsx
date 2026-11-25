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
  const [cancelMessage, setCancelMessage] = useState({ type: '', text: '' });
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = async () => {
    try {
      const res = await client.get('/api/bookings/my');
      setBookings(res.data || []);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }
    setCancellingId(bookingId);
    setCancelMessage({ type: '', text: '' });
    try {
      const res = await client.post(`/api/bookings/${bookingId}/cancel`);
      setCancelMessage({ type: 'success', text: res.data.message || 'Booking Cancelled successfully' });
      await loadBookings();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to cancel booking';
      setCancelMessage({ type: 'danger', text: msg });
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-brand-light transition-colors">
      <Header />

      <main className="flex-grow">
        {/* Sub-Banner Header */}
        <section className="relative h-44 sm:h-52 bg-slate-950 flex items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 subbanner-overlay"></div>
          <div className="relative z-10 px-4">
            <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
              My Bookings
            </h1>
            <nav className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium mt-2">
              <Link to="/" className="hover:text-brand-red transition-colors">Home</Link>
              <i className="fa-solid fa-chevron-right text-[10px] text-slate-500"></i>
              <span className="text-white font-semibold">My Bookings</span>
            </nav>
          </div>
        </section>

        {/* Dashboard Content */}
        <section className="py-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar Column */}
            <div className="lg:col-span-4 xl:col-span-3">
              <Sidebar active="booking" />
            </div>

            {/* Main Bookings List Column */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              
              {/* Banner Message */}
              {cancelMessage.text && (
                <div
                  className={`alert alert-${cancelMessage.type} p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                    cancelMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  <i className={`fa-solid ${cancelMessage.type === 'success' ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'} text-sm`}></i>
                  <span>{cancelMessage.text}</span>
                </div>
              )}

              {/* Card Container */}
              <div className="surface-card bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 transition-colors">
                <div className="flex items-center justify-between pb-5 mb-6 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <i className="fa-solid fa-calendar-check text-brand-red text-lg"></i>
                    <h2 className="text-adaptive-main font-display font-extrabold text-xl text-slate-900">
                      Your Booking History
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'}
                  </span>
                </div>

                <div className="my_vehicles_list">
                  <ul className="vehicle_listing space-y-6">
                    {loading ? (
                      <div className="text-center py-12 text-slate-500 font-semibold">
                        <i className="fa-solid fa-spinner fa-spin text-brand-red text-2xl mb-2 block"></i>
                        <span>Loading bookings...</span>
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 space-y-3">
                        <i className="fa-solid fa-calendar-xmark text-4xl text-slate-300 block"></i>
                        <p className="text-sm font-semibold">You have not made any bookings yet.</p>
                        <Link
                          to="/car-listing"
                          className="inline-block px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider transition-all"
                        >
                          Browse Available Fleet
                        </Link>
                      </div>
                    ) : (
                      bookings.map((booking) => {
                        const bookingId = booking.id || booking.bookingId;
                        const isConfirmedBooking = Number(booking.Status) === 1;
                        const isCancelledBooking = Number(booking.Status) === 2;
                        const isPaymentConfirmed = booking.payment_status === 'confirmed';

                        return (
                          <li
                            key={bookingId}
                            data-booking-id={bookingId}
                            className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-5 items-start justify-between transition-all"
                          >
                            {/* Left: Vehicle Image & Basic Info */}
                            <div className="flex flex-col sm:flex-row gap-4 flex-grow">
                              <div className="vehicle_img w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                                <Link to={`/vehical-details/${booking.vid}`}>
                                  <img
                                    src={getVehicleImageUrl(booking.Vimage1)}
                                    alt="Vehicle"
                                    className="w-full h-full object-cover"
                                  />
                                </Link>
                              </div>

                              <div className="vehicle_title space-y-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                  Booking #{bookingId}
                                </span>
                                <h3 className="font-display font-extrabold text-base text-slate-900 dark:text-white hover:text-brand-red transition-colors">
                                  <Link to={`/vehical-details/${booking.vid}`} className="text-slate-900 dark:text-white hover:text-brand-red">
                                    {booking.BrandName ? `${booking.BrandName}, ` : ''}{booking.VehiclesTitle}
                                  </Link>
                                </h3>
                                
                                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                  <p>
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">From Date:</span>{' '}
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{booking.FromDate}</span>
                                  </p>
                                  <p>
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">To Date:</span>{' '}
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{booking.ToDate}</span>
                                  </p>
                                  <p>
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">Total Amount:</span>{' '}
                                    <span className="font-black text-brand-red">Rs. {booking.totalAmount}</span>
                                  </p>
                                  {booking.message && (
                                    <p className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                      <b>Message:</b> {booking.message}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Booking Status & Action Buttons */}
                            <div className="vehicle_status flex flex-col items-start md:items-end gap-2.5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-200">
                              
                              {/* Booking Status Badge */}
                              {isConfirmedBooking ? (
                                <a
                                  href="#"
                                  onClick={(e) => e.preventDefault()}
                                  className="btn outline btn-xs active-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold"
                                >
                                  <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                  <span>Confirmed</span>
                                </a>
                              ) : isCancelledBooking ? (
                                <div>
                                  <a
                                    href="#"
                                    onClick={(e) => e.preventDefault()}
                                    className="btn outline btn-xs inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold"
                                  >
                                    <i className="fa-solid fa-circle-xmark text-rose-600"></i>
                                    <span>Cancelled</span>
                                  </a>
                                  {booking.payment_status === 'needs_refund' && (
                                    <div className="pt-1">
                                      <span className="label label-warning px-2.5 py-1 rounded-md bg-amber-500 text-white font-bold text-[10px]">
                                        Needs Refund
                                      </span>
                                      <p className="text-slate-500 text-[11px] italic mt-1">
                                        Payment flagged for refund
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <a
                                  href="#"
                                  onClick={(e) => e.preventDefault()}
                                  className="btn outline btn-xs inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold"
                                >
                                  <i className="fa-solid fa-hourglass-half text-amber-600"></i>
                                  <span>Not Confirm yet</span>
                                </a>
                              )}

                              {/* Payment Section */}
                              <div className="payment_status text-xs text-left md:text-right space-y-1.5">
                                {isConfirmedBooking && (
                                  <>
                                    {isPaymentConfirmed ? (
                                      <div className="space-y-1">
                                        <p className="font-bold text-emerald-700">
                                          <b>Payment Status:</b> <span className="text-emerald-700 font-bold">Confirmed</span>
                                        </p>
                                        <p className="text-[11px] text-slate-500">
                                          Method: {booking.payment_method || 'Online'}
                                        </p>
                                        <p className="text-[11px] text-slate-500 font-mono">
                                          Ref ID: {booking.gateway_payment_id || booking.transaction_id || 'N/A'}
                                        </p>
                                        <div className="pt-1">
                                          <Link
                                            to={`/receipt/${bookingId}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                                            target="_blank"
                                          >
                                            <i className="fa-solid fa-receipt text-xs"></i>
                                            <span>Download Receipt</span>
                                          </Link>
                                        </div>
                                        <p className="text-slate-500 cancel-support-notice text-[11px] italic pt-1">
                                          <Link to="/contact-us" className="text-brand-red underline font-medium">Contact support</Link> to cancel a paid booking
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {booking.payment_status === 'failed' && (
                                          <p className="text-rose-600 text-[11px] font-semibold">
                                            Payment failed. You can try again.
                                          </p>
                                        )}
                                        {booking.payment_status === 'pending' && (
                                          <p className="text-amber-700 text-[11px] font-semibold">
                                            <b>Status:</b> Pending payment
                                          </p>
                                        )}
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-xs px-4 py-2 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all min-h-[44px]"
                                          onClick={() => setSelectedBookingForPayment(booking)}
                                        >
                                          {booking.payment_status === 'failed' ? 'Retry Payment' : 'Pay now'}
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Cancel Booking Action */}
                              {!isCancelledBooking && !isPaymentConfirmed && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-xs cancel-booking-btn px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-700 font-bold text-xs transition-colors min-h-[44px]"
                                    disabled={cancellingId === bookingId}
                                    onClick={() => handleCancelBooking(bookingId)}
                                  >
                                    {cancellingId === bookingId ? 'Cancelling...' : 'Cancel booking'}
                                  </button>
                                </div>
                              )}

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

        </section>
      </main>

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
    </div>
  );
}
