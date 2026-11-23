import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import client from '../api/client';

export default function ReceiptPage() {
  const { bookingId: paramBookingId } = useParams();
  const [searchParams] = useSearchParams();
  const bookingId = paramBookingId || searchParams.get('booking_id');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const res = await client.get(`/api/payments/receipt/${bookingId}`);
        setReceipt(res.data);
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.message || 'Invalid booking ID or payment not confirmed.');
      } finally {
        setLoading(false);
      }
    }
    if (bookingId) {
      fetchReceipt();
    } else {
      setError('Booking ID not provided.');
      setLoading(false);
    }
  }, [bookingId]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading receipt...</div>;
  }

  if (error || !receipt) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#a94442', fontFamily: 'Arial, sans-serif' }}>
        <h3>{error || 'Invalid booking ID or payment not confirmed.'}</h3>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.6, margin: 0, padding: '20px' }}>
      <style>{`
        .receipt-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #ccc;
          padding: 20px;
          background: #fff;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .receipt-info-section {
          margin-bottom: 20px;
        }
        .receipt-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .receipt-amount-section {
          margin-top: 20px;
          border-top: 1px solid #ccc;
          padding-top: 10px;
        }
        .receipt-print-btn {
          text-align: center;
          margin-top: 20px;
        }
        .receipt-print-btn button {
          padding: 8px 16px;
          font-size: 14px;
          cursor: pointer;
        }
        @media print {
          .receipt-print-btn {
            display: none;
          }
          body {
            padding: 0;
          }
        }
      `}</style>

      <div className="receipt-container">
        <div className="receipt-header">
          <h1 style={{ margin: '0 0 10px 0' }}>WanderWheels Rental Receipt</h1>
          <p style={{ margin: '5px 0' }}>Receipt #: {receipt.receiptNumber}</p>
          <p style={{ margin: '5px 0' }}>Date: {receipt.date}</p>
        </div>

        <div className="receipt-info-section">
          <div className="receipt-info-grid">
            <div>
              <h3 style={{ margin: '0 0 10px 0' }}>Customer Information</h3>
              <p style={{ margin: '5px 0' }}>Name: {receipt.customer?.name}</p>
              <p style={{ margin: '5px 0' }}>Address: {receipt.customer?.address}</p>
              <p style={{ margin: '5px 0' }}>City: {receipt.customer?.city}</p>
              <p style={{ margin: '5px 0' }}>Country: {receipt.customer?.country}</p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 10px 0' }}>Rental Information</h3>
              <p style={{ margin: '5px 0' }}>Vehicle: {receipt.rental?.vehicle || receipt.rental?.vehicleTitle}</p>
              <p style={{ margin: '5px 0' }}>From Date: {receipt.rental?.fromDate}</p>
              <p style={{ margin: '5px 0' }}>To Date: {receipt.rental?.toDate}</p>
              <p style={{ margin: '5px 0' }}>Duration: {receipt.rental?.durationDays || receipt.rental?.days} days</p>
            </div>
          </div>
        </div>

        <div className="receipt-amount-section">
          <h3 style={{ margin: '0 0 10px 0' }}>Payment Details</h3>
          <p style={{ margin: '5px 0' }}>Price Per Day: Rs. {receipt.payment?.pricePerDay || receipt.rental?.pricePerDay}</p>
          <p style={{ margin: '5px 0' }}>Number of Days: {receipt.payment?.numberOfDays || receipt.rental?.durationDays || receipt.rental?.days}</p>
          <p style={{ margin: '5px 0' }}>Total Amount: Rs. {receipt.payment?.totalAmount || receipt.payment?.amount}</p>
          <p style={{ margin: '5px 0' }}>Payment Method: {receipt.payment?.paymentMethod || receipt.payment?.method}</p>
          <p style={{ margin: '5px 0' }}>Transaction ID: {receipt.payment?.transactionId || receipt.payment?.transaction_id}</p>
          <p style={{ margin: '5px 0' }}>
            Payment Status: {receipt.payment?.paymentStatus || (receipt.payment?.status ? receipt.payment.status.charAt(0).toUpperCase() + receipt.payment.status.slice(1) : '')}
          </p>
          <p style={{ margin: '5px 0' }}>Payment Date: {receipt.payment?.paymentDate}</p>
        </div>

        <div className="receipt-print-btn">
          <button type="button" onClick={() => window.print()}>Print Receipt</button>
        </div>
      </div>
    </div>
  );
}
