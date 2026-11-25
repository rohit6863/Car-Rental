import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function PaymentModal({ booking, onClose, onSuccess }) {
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [step, setStep] = useState('idle'); // idle | preparing | mock_checkout | verifying | polling | success | failed | cancelled
  const [currentOrder, setCurrentOrder] = useState(null);
  const [mockTab, setMockTab] = useState('upi'); // upi | card | netbanking
  const [errorMessage, setErrorMessage] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const pollTimerRef = useRef(null);

  const isProd = import.meta.env.PROD;

  useEffect(() => {
    let isMounted = true;
    async function fetchConfig() {
      try {
        const res = await client.get('/api/payments/config');
        if (isMounted) setConfig(res.data);
      } catch (err) {
        if (isMounted) setConfig({ available: false });
      } finally {
        if (isMounted) setConfigLoading(false);
      }
    }
    fetchConfig();
    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  if (!booking) return null;

  const bookingId = booking.id || booking.bookingId;

  // ─── Step 1: Create Order & open checkout ───────────────────────────────────
  const handlePayClick = async () => {
    setStep('preparing');
    setErrorMessage('');

    try {
      const res = await client.post('/api/payments/order', {
        bookingId,
      });
      const order = res.data;
      setCurrentOrder(order);

      if (order.gateway === 'mock') {
        if (isProd) {
          setErrorMessage('Mock gateway is not supported in production.');
          setStep('failed');
          return;
        }
        setStep('mock_checkout');
      } else if (order.gateway === 'razorpay') {
        await loadAndLaunchRazorpay(order);
      } else {
        setErrorMessage('Unknown payment gateway');
        setStep('failed');
      }
    } catch (err) {
      if (err.response?.status === 503) {
        setErrorMessage('Online payments are currently unavailable. Please contact support.');
      } else {
        setErrorMessage(err.response?.data?.message || err.response?.data?.error || 'Failed to initiate payment');
      }
      setStep('failed');
    }
  };

  // ─── Razorpay Script Loader & Modal ─────────────────────────────────────────
  const loadAndLaunchRazorpay = (order) => {
    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('razorpay-checkout-js');
      if (existingScript) {
        openRazorpay(order, resolve, reject);
      } else {
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => openRazorpay(order, resolve, reject);
        script.onerror = () => {
          setErrorMessage('Failed to load secure payment checkout. Please check your connection.');
          setStep('failed');
          reject(new Error('Razorpay load error'));
        };
        document.body.appendChild(script);
      }
    });
  };

  const openRazorpay = (order, resolve, reject) => {
    try {
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'WanderWheels',
        description: `Booking #${bookingId}`,
        order_id: order.orderId,
        handler: async (response) => {
          setStep('verifying');
          try {
            await client.post('/api/payments/verify', {
              bookingId,
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setStep('success');
            if (onSuccess) onSuccess(bookingId);
            resolve();
          } catch (err) {
            setErrorMessage(err.response?.data?.message || err.response?.data?.error || 'Payment verification failed');
            setStep('failed');
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            setStep('cancelled');
            resolve();
          },
        },
        prefill: {
          name: booking.FullName || '',
          email: booking.userEmail || '',
        },
        theme: {
          color: '#fa2837',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (failResp) => {
        setErrorMessage(failResp.error?.description || 'Payment failed. Your booking is still confirmed.');
        setStep('failed');
      });
      rzp.open();
    } catch (err) {
      setErrorMessage('Could not open payment checkout: ' + err.message);
      setStep('failed');
      reject(err);
    }
  };

  // ─── Mock Checkout Simulation Handlers ─────────────────────────────────────
  const handleMockSuccess = async () => {
    if (isProd) return;
    setStep('verifying');
    setErrorMessage('');

    try {
      // 1. Obtain mock signature & register payment in mock gateway
      const simRes = await client.post('/api/payments/mock/simulate', {
        orderId: currentOrder.orderId,
        action: 'success',
        method: `mock_${mockTab}`,
      });

      const { paymentId, signature } = simRes.data;

      // 2. Submit to real verification route
      await client.post('/api/payments/verify', {
        bookingId,
        orderId: currentOrder.orderId,
        paymentId,
        signature,
      });

      setStep('success');
      if (onSuccess) onSuccess(bookingId);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.response?.data?.error || 'Verification failed');
      setStep('failed');
    }
  };

  const handleMockFailure = async () => {
    if (isProd) return;
    try {
      await client.post('/api/payments/mock/simulate', {
        orderId: currentOrder?.orderId,
        action: 'failure',
        reason: 'Simulated decline by customer',
      });
    } catch (err) {
      // Ignore simulation reporting error
    }
    setErrorMessage('Payment failed. Your booking is still confirmed. You can try again.');
    setStep('failed');
  };

  const handleMockCancel = () => {
    setStep('cancelled');
  };

  // ─── Polling fallback (when pending) ───────────────────────────────────────
  const startPolling = (currentAttempt = 1) => {
    setStep('polling');
    setPollCount(currentAttempt);

    pollTimerRef.current = setTimeout(async () => {
      try {
        const res = await client.get(`/api/payments/status/${bookingId}`);
        if (res.data.status === 'confirmed') {
          setStep('success');
          if (onSuccess) onSuccess(bookingId);
          return;
        }

        if (currentAttempt < 5) {
          startPolling(currentAttempt + 1);
        } else {
          setErrorMessage('Payment is being processed. Please check back shortly.');
          setStep('polling_stopped');
        }
      } catch (err) {
        if (currentAttempt < 5) {
          startPolling(currentAttempt + 1);
        } else {
          setErrorMessage('Payment is being processed. Please check back shortly.');
          setStep('polling_stopped');
        }
      }
    }, 2000);
  };

  const handleRetry = () => {
    setErrorMessage('');
    setStep('idle');
  };

  const isOnlineAvailable = Boolean(config && config.available);
  const isMockGateway = Boolean(!isProd && config && config.gateway === 'mock');

  return (
    <div
      className="modal payment-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overflow-x-hidden"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'preparing' && step !== 'verifying') {
          onClose();
        }
      }}
    >
      <div className="modal-dialog payment-modal-dialog w-full max-w-lg mx-auto my-auto">
        <div className="modal-content payment-modal-content surface-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)] transition-colors">
          
          {/* Header */}
          <div className="modal-header payment-modal-header bg-brand-dark text-white px-5 py-4 flex items-center justify-between gap-3 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <i className="fa-solid fa-shield-halved text-brand-red text-base flex-shrink-0"></i>
              <h4 className="modal-title font-display font-extrabold text-sm sm:text-base text-white truncate">
                Secure Online Payment — Booking #{bookingId}
              </h4>
            </div>
            <button
              type="button"
              className="close w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none flex-shrink-0 cursor-pointer disabled:opacity-50"
              onClick={onClose}
              aria-label="Close"
              disabled={step === 'preparing' || step === 'verifying'}
            >
              <span aria-hidden="true" className="text-xl leading-none">&times;</span>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body payment-modal-body p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 dark:text-slate-100">
            {/* Mock Safety Banner */}
            {isMockGateway && (
              <div className="alert alert-warning p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium leading-relaxed">
                <i className="fa-solid fa-flask mr-1.5 text-amber-600 dark:text-amber-400"></i>
                <strong>Test Mode:</strong> Test payment gateway (mock): no real money is charged.
              </div>
            )}

            {/* Gateway Unavailable Warning */}
            {!configLoading && !isOnlineAvailable && (
              <div className="alert alert-danger p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold">
                <i className="fa-solid fa-circle-xmark mr-1.5 text-rose-600 dark:text-rose-400"></i>
                Online payments are currently unavailable. Please contact support.
              </div>
            )}

            {/* Booking Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <h5 className="font-display font-bold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700">
                Booking Summary
              </h5>
              <div className="text-xs sm:text-sm space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between gap-2">
                  <strong className="text-slate-700 dark:text-slate-200">Vehicle:</strong>
                  <span className="font-semibold text-right text-slate-900 dark:text-white">
                    {booking.BrandName ? `${booking.BrandName}, ` : ''}{booking.VehiclesTitle}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <strong className="text-slate-700 dark:text-slate-200">Dates:</strong>
                  <span className="font-semibold text-right">{booking.FromDate} to {booking.ToDate}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <strong className="text-slate-700 dark:text-slate-200">Rate per Day:</strong>
                  <span className="font-semibold text-right">Rs. {booking.PricePerDay}</span>
                </div>
                <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-sm sm:text-base">
                  <strong className="text-slate-900 dark:text-white">Total Amount:</strong>
                  <span className="booking-amount-highlight font-black text-brand-red">Rs. {booking.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="alert alert-danger p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold leading-relaxed">
                <i className="fa-solid fa-triangle-exclamation mr-1.5 text-rose-600 dark:text-rose-400"></i>
                {errorMessage}
              </div>
            )}

            {/* State: Preparing / Verifying */}
            {(step === 'preparing' || step === 'verifying') && (
              <div className="text-center py-6 space-y-2">
                <i className="fa-solid fa-spinner fa-spin text-brand-red text-2xl"></i>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {step === 'preparing' ? 'Preparing payment...' : 'Verifying payment with gateway...'}
                </p>
                <div className="text-xs text-slate-500 dark:text-slate-400">Please do not close this window.</div>
              </div>
            )}

            {/* State: Polling */}
            {step === 'polling' && (
              <div className="text-center py-6 space-y-2">
                <i className="fa-solid fa-spinner fa-spin text-sky-500 text-2xl"></i>
                <p className="text-sm font-bold text-sky-700 dark:text-sky-300">
                  Payment pending confirmation. Refreshing... (attempt {pollCount}/5)
                </p>
              </div>
            )}

            {/* State: Polling Stopped */}
            {step === 'polling_stopped' && (
              <div className="alert alert-info p-4 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 text-xs font-semibold">
                Payment is being processed. Please check back shortly.
              </div>
            )}

            {/* State: Success */}
            {step === 'success' && (
              <div className="alert alert-success p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 space-y-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-lg"></i>
                  <h4 className="font-display font-extrabold text-base">Payment Successful!</h4>
                </div>
                <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200">
                  Payment of Rs. {booking.totalAmount} was confirmed successfully.
                </p>
                <Link
                  to={`/receipt/${bookingId}`}
                  target="_blank"
                  className="payment-btn inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors"
                >
                  <i className="fa-solid fa-receipt text-xs"></i>
                  <span>View Receipt</span>
                </Link>
              </div>
            )}

            {/* State: Failed */}
            {step === 'failed' && (
              <div className="alert alert-danger p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-3">
                <p className="text-xs sm:text-sm font-semibold">
                  Payment failed. Your booking is still confirmed. You can try again.
                </p>
                <button
                  type="button"
                  className="payment-btn w-full sm:w-auto px-5 py-2.5 min-h-[48px] rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            )}

            {/* State: Cancelled */}
            {step === 'cancelled' && (
              <div className="alert alert-warning p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 space-y-3">
                <p className="text-xs sm:text-sm font-semibold">
                  Payment cancelled. You can try again.
                </p>
                <button
                  type="button"
                  className="payment-btn w-full sm:w-auto px-5 py-2.5 min-h-[48px] rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            )}

            {/* State: Mock Checkout Popup */}
            {!isProd && step === 'mock_checkout' && (
              <div className="p-4 rounded-xl border-2 border-dashed border-sky-400 dark:border-sky-600 bg-sky-50/70 dark:bg-sky-950/30 space-y-4">
                <h5 className="font-display font-bold text-sm text-sky-700 dark:text-sky-300">
                  Mock Payment Simulator (Local Development Only)
                </h5>

                {/* Decorative Tabs */}
                <ul className="mock-tabs grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <li>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setMockTab('upi'); }}
                      className={`min-h-[44px] px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center text-center transition-colors ${
                        mockTab === 'upi'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      UPI (Mock)
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setMockTab('card'); }}
                      className={`min-h-[44px] px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center text-center transition-colors ${
                        mockTab === 'card'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Card (Mock)
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setMockTab('netbanking'); }}
                      className={`min-h-[44px] px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center text-center transition-colors ${
                        mockTab === 'netbanking'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      Netbanking (Mock)
                    </a>
                  </li>
                </ul>

                <div>
                  {mockTab === 'upi' && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Simulated VPA / UPI ID:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono"
                        readOnly
                        value="customer@wanderwheels"
                      />
                    </div>
                  )}
                  {mockTab === 'card' && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Simulated Card Number:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono"
                        readOnly
                        value="4111 •••• •••• 1111 (Visa Mock)"
                      />
                    </div>
                  )}
                  {mockTab === 'netbanking' && (
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Simulated Bank:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-mono"
                        readOnly
                        value="State Bank of WanderWheels"
                      />
                    </div>
                  )}
                </div>

                <div className="mock-action-buttons flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    className="payment-btn flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                    onClick={handleMockSuccess}
                  >
                    Simulate success
                  </button>
                  <button
                    type="button"
                    className="payment-btn flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                    onClick={handleMockFailure}
                  >
                    Simulate failure
                  </button>
                  <button
                    type="button"
                    className="payment-btn flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    onClick={handleMockCancel}
                  >
                    Close without paying
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {(step === 'idle' || step === 'success' || step === 'polling_stopped') && (
            <div className="modal-footer payment-modal-footer px-5 py-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 flex-shrink-0">
              {step === 'idle' && (
                <>
                  <button
                    type="button"
                    className="payment-btn w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    onClick={onClose}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="payment-btn w-full sm:w-auto min-h-[48px] px-6 py-2.5 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-glow transition-all cursor-pointer disabled:opacity-50"
                    onClick={handlePayClick}
                    disabled={configLoading || !isOnlineAvailable}
                  >
                    {configLoading ? 'Checking gateway...' : 'Pay securely'}
                  </button>
                </>
              )}

              {(step === 'success' || step === 'polling_stopped') && (
                <button
                  type="button"
                  className="payment-btn w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  onClick={onClose}
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
