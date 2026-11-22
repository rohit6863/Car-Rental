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
        name: 'WandarWheels Car Rental',
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
      className="modal"
      style={{
        display: 'block',
        backgroundColor: 'rgba(0,0,0,0.6)',
        overflowY: 'auto',
        zIndex: 1050,
      }}
    >
      <div className="modal-dialog" style={{ marginTop: '60px' }}>
        <div className="modal-content">
          <div className="modal-header">
            <button
              type="button"
              className="close"
              onClick={onClose}
              aria-label="Close"
              disabled={step === 'preparing' || step === 'verifying'}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <h4 className="modal-title">
              Secure Online Payment — Booking #{bookingId}
            </h4>
          </div>

          <div className="modal-body">
            {/* Mock Safety Banner */}
            {isMockGateway && (
              <div
                className="alert alert-warning"
                style={{
                  backgroundColor: '#fff3cd',
                  color: '#856404',
                  borderColor: '#ffeeba',
                  padding: '10px 14px',
                  marginBottom: '15px',
                  borderRadius: '4px',
                }}
              >
                <strong>Test Mode:</strong> Test payment gateway (mock): no real money is charged.
              </div>
            )}

            {/* Gateway Unavailable Warning */}
            {!configLoading && !isOnlineAvailable && (
              <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
                Online payments are currently unavailable. Please contact support.
              </div>
            )}

            {/* Booking Summary Box */}
            <div
              style={{
                backgroundColor: '#f9f9f9',
                border: '1px solid #e1e1e1',
                padding: '14px',
                borderRadius: '4px',
                marginBottom: '18px',
              }}
            >
              <h5 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>
                Booking Summary
              </h5>
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                <div><strong>Vehicle:</strong> {booking.BrandName ? `${booking.BrandName}, ` : ''}{booking.VehiclesTitle}</div>
                <div><strong>Dates:</strong> {booking.FromDate} to {booking.ToDate}</div>
                <div><strong>Rate per Day:</strong> Rs. {booking.PricePerDay}</div>
                <div style={{ marginTop: '8px', fontSize: '15px', color: '#111' }}>
                  <strong>Total Amount:</strong> <span style={{ color: '#fa2837', fontWeight: 'bold' }}>Rs. {booking.totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="alert alert-danger" style={{ marginBottom: '15px' }}>
                {errorMessage}
              </div>
            )}

            {/* State: Preparing / Verifying */}
            {(step === 'preparing' || step === 'verifying') && (
              <div className="text-center" style={{ padding: '20px 0' }}>
                <p style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {step === 'preparing' ? 'Preparing payment...' : 'Verifying payment with gateway...'}
                </p>
                <div style={{ color: '#777', fontSize: '13px' }}>Please do not close this window.</div>
              </div>
            )}

            {/* State: Polling */}
            {step === 'polling' && (
              <div className="text-center" style={{ padding: '20px 0' }}>
                <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#31708f' }}>
                  Payment pending confirmation. Refreshing... (attempt {pollCount}/5)
                </p>
              </div>
            )}

            {/* State: Polling Stopped */}
            {step === 'polling_stopped' && (
              <div className="alert alert-info">
                Payment is being processed. Please check back shortly.
              </div>
            )}

            {/* State: Success */}
            {step === 'success' && (
              <div className="alert alert-success" style={{ padding: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Payment Successful!</h4>
                <p style={{ margin: '0 0 12px 0' }}>
                  Payment of Rs. {booking.totalAmount} was confirmed successfully.
                </p>
                <Link
                  to={`/receipt/${bookingId}`}
                  target="_blank"
                  className="btn btn-sm btn-success"
                  style={{ textDecoration: 'none' }}
                >
                  View Receipt
                </Link>
              </div>
            )}

            {/* State: Failed */}
            {step === 'failed' && (
              <div className="alert alert-danger" style={{ padding: '14px' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  Payment failed. Your booking is still confirmed. You can try again.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            )}

            {/* State: Cancelled */}
            {step === 'cancelled' && (
              <div className="alert alert-warning" style={{ padding: '14px' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  Payment cancelled. You can try again.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleRetry}
                >
                  Retry
                </button>
              </div>
            )}

            {/* State: Mock Checkout Popup */}
            {!isProd && step === 'mock_checkout' && (
              <div
                style={{
                  border: '2px dashed #0088cc',
                  padding: '16px',
                  borderRadius: '6px',
                  backgroundColor: '#f0f8ff',
                  marginTop: '10px',
                }}
              >
                <h5 style={{ margin: '0 0 12px 0', color: '#0088cc' }}>
                  Mock Payment Simulator (Local Development Only)
                </h5>

                {/* Decorative Tabs */}
                <ul className="nav nav-tabs" style={{ marginBottom: '14px' }}>
                  <li className={mockTab === 'upi' ? 'active' : ''}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setMockTab('upi'); }}>
                      UPI (Mock)
                    </a>
                  </li>
                  <li className={mockTab === 'card' ? 'active' : ''}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setMockTab('card'); }}>
                      Card (Mock)
                    </a>
                  </li>
                  <li className={mockTab === 'netbanking' ? 'active' : ''}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setMockTab('netbanking'); }}>
                      Netbanking (Mock)
                    </a>
                  </li>
                </ul>

                <div style={{ marginBottom: '15px' }}>
                  {mockTab === 'upi' && (
                    <div>
                      <label style={{ fontSize: '12px' }}>Simulated VPA / UPI ID:</label>
                      <input
                        type="text"
                        className="form-control input-sm"
                        readOnly
                        value="customer@wandarwheels"
                      />
                    </div>
                  )}
                  {mockTab === 'card' && (
                    <div>
                      <label style={{ fontSize: '12px' }}>Simulated Card Number:</label>
                      <input
                        type="text"
                        className="form-control input-sm"
                        readOnly
                        value="4111 •••• •••• 1111 (Visa Mock)"
                      />
                    </div>
                  )}
                  {mockTab === 'netbanking' && (
                    <div>
                      <label style={{ fontSize: '12px' }}>Simulated Bank:</label>
                      <input
                        type="text"
                        className="form-control input-sm"
                        readOnly
                        value="State Bank of WandarWheels"
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleMockSuccess}
                  >
                    Simulate success
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleMockFailure}
                  >
                    Simulate failure
                  </button>
                  <button
                    type="button"
                    className="btn btn-default btn-sm"
                    onClick={handleMockCancel}
                  >
                    Close without paying
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {step === 'idle' && (
              <>
                <button
                  type="button"
                  className="btn btn-default"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
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
                className="btn btn-default"
                onClick={onClose}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}