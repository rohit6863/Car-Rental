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
        name: 'WanderWheels Car Rental',
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
    <div className="modal payment-modal-overlay">
      <style>{`
        .payment-modal-overlay {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          overflow-y: auto;
          overflow-x: hidden;
          z-index: 1050;
          box-sizing: border-box;
          padding: 10px;
        }
        .payment-modal-dialog {
          margin: 60px auto;
          max-width: 550px;
          width: 100%;
          box-sizing: border-box;
        }
        .payment-modal-content {
          border-radius: 6px;
          background: #fff;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          box-sizing: border-box;
          width: 100%;
          border: 1px solid rgba(0, 0, 0, 0.2);
        }
        .payment-btn {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 16px;
          box-sizing: border-box;
          cursor: pointer;
          border-radius: 4px;
        }
        .mock-action-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mock-action-buttons .payment-btn {
          flex: 1 1 auto;
        }
        .booking-amount-highlight {
          font-size: 16px;
          color: #fa2837;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .payment-modal-overlay {
            padding: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .payment-modal-dialog {
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: calc(100vh - 16px) !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .payment-modal-content {
            max-height: calc(100vh - 16px) !important;
            display: flex !important;
            flex-direction: column !important;
            border-radius: 8px !important;
            width: 100% !important;
          }
          .payment-modal-header {
            padding: 12px 14px !important;
            flex-shrink: 0 !important;
            border-bottom: 1px solid #e5e5e5;
          }
          .payment-modal-header .close {
            min-width: 44px;
            min-height: 44px;
            margin-top: -6px;
            font-size: 28px;
            line-height: 44px;
            text-align: center;
            opacity: 0.8;
          }
          .payment-modal-body {
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            flex: 1 1 auto !important;
            padding: 14px !important;
            max-height: calc(100vh - 150px) !important;
            box-sizing: border-box;
          }
          .payment-modal-footer {
            flex-shrink: 0 !important;
            padding: 12px 14px !important;
            display: flex !important;
            flex-direction: column-reverse !important;
            gap: 8px !important;
            border-top: 1px solid #e5e5e5;
          }
          .payment-modal-footer .payment-btn {
            width: 100% !important;
            margin: 0 !important;
            font-size: 15px !important;
          }
          .mock-action-buttons {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .mock-action-buttons .payment-btn {
            width: 100% !important;
            font-size: 14px !important;
          }
          .mock-tabs {
            display: flex !important;
            width: 100% !important;
            margin-bottom: 12px !important;
          }
          .mock-tabs > li {
            flex: 1 1 0 !important;
            text-align: center !important;
          }
          .mock-tabs > li > a {
            padding: 10px 4px !important;
            font-size: 12px !important;
            min-height: 44px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .booking-amount-highlight {
            font-size: 18px !important;
          }
        }
      `}</style>

      <div className="modal-dialog payment-modal-dialog">
        <div className="modal-content payment-modal-content">
          <div className="modal-header payment-modal-header">
            <button
              type="button"
              className="close"
              onClick={onClose}
              aria-label="Close"
              disabled={step === 'preparing' || step === 'verifying'}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            <h4 className="modal-title" style={{ fontSize: '16px', fontWeight: 'bold' }}>
              Secure Online Payment — Booking #{bookingId}
            </h4>
          </div>

          <div className="modal-body payment-modal-body">
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
                  fontSize: '13px',
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
                  <strong>Total Amount:</strong> <span className="booking-amount-highlight">Rs. {booking.totalAmount}</span>
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
                  className="btn btn-success payment-btn"
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
                  className="btn btn-primary payment-btn"
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
                  className="btn btn-primary payment-btn"
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
                <ul className="nav nav-tabs mock-tabs" style={{ marginBottom: '14px' }}>
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
                        value="customer@wanderwheels"
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
                        value="State Bank of WanderWheels"
                      />
                    </div>
                  )}
                </div>

                <div className="mock-action-buttons">
                  <button
                    type="button"
                    className="btn btn-success payment-btn"
                    onClick={handleMockSuccess}
                  >
                    Simulate success
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger payment-btn"
                    onClick={handleMockFailure}
                  >
                    Simulate failure
                  </button>
                  <button
                    type="button"
                    className="btn btn-default payment-btn"
                    onClick={handleMockCancel}
                  >
                    Close without paying
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer payment-modal-footer">
            {step === 'idle' && (
              <>
                <button
                  type="button"
                  className="btn btn-default payment-btn"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary payment-btn"
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
                className="btn btn-default payment-btn"
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
