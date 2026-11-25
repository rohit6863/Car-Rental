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
    return (
      <div className="min-h-screen bg-brand-light dark:bg-brand-darker flex items-center justify-center p-8 text-slate-600 dark:text-slate-300 font-semibold">
        <div className="text-center space-y-2">
          <i className="fa-solid fa-spinner fa-spin text-brand-red text-2xl block"></i>
          <span>Loading receipt...</span>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-brand-light dark:bg-brand-darker flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 text-center text-rose-700 dark:text-rose-300 shadow-card">
          <i className="fa-solid fa-circle-xmark text-3xl text-rose-500 mb-3 block"></i>
          <h3 className="font-display font-bold text-base">{error || 'Invalid booking ID or payment not confirmed.'}</h3>
        </div>
      </div>
    );
  }

  const paymentStatusText =
    receipt.payment?.paymentStatus ||
    (receipt.payment?.status ? receipt.payment.status.charAt(0).toUpperCase() + receipt.payment.status.slice(1) : '');

  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-darker py-8 sm:py-12 px-4 sm:px-6 transition-colors print:bg-white print:p-0">
      <div className="receipt-container max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-card overflow-hidden print:border-slate-300 print:shadow-none print:rounded-none print:bg-white print:text-slate-900">
        
        {/* Branded Receipt Header */}
        <div className="receipt-header bg-brand-dark text-white px-6 sm:px-8 py-6 border-b-4 border-brand-red flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:bg-white print:text-slate-900 print:border-slate-900">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-400 print:text-slate-600">
              WanderWheels Official Invoice
            </p>
            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white mt-1 print:text-slate-900">
              WanderWheels Rental Receipt
            </h1>
          </div>
          <div className="sm:text-right text-xs text-slate-300 space-y-1 print:text-slate-700">
            <p className="font-mono font-bold text-white print:text-slate-900">
              Receipt #: {receipt.receiptNumber}
            </p>
            <p>Date: {receipt.date}</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8 text-slate-800 dark:text-slate-200 print:text-slate-900">
          
          {/* 2-Column Customer & Rental Info Grid */}
          <div className="receipt-info-section grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 print:bg-slate-50 print:border-slate-300">
              <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-700 print:text-slate-600">
                Customer Information
              </h3>
              <div className="text-xs sm:text-sm space-y-1.5 pt-1">
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Name:</span> <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">{receipt.customer?.name}</span></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Address:</span> {receipt.customer?.address}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">City:</span> {receipt.customer?.city}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Country:</span> {receipt.customer?.country}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 print:bg-slate-50 print:border-slate-300">
              <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200 dark:border-slate-700 print:text-slate-600">
                Rental Information
              </h3>
              <div className="text-xs sm:text-sm space-y-1.5 pt-1">
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Vehicle:</span> <span className="font-bold text-slate-900 dark:text-white print:text-slate-900">{receipt.rental?.vehicle || receipt.rental?.vehicleTitle}</span></p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">From Date:</span> {receipt.rental?.fromDate}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">To Date:</span> {receipt.rental?.toDate}</p>
                <p><span className="font-semibold text-slate-500 dark:text-slate-400">Duration:</span> {receipt.rental?.durationDays || receipt.rental?.days} days</p>
              </div>
            </div>
          </div>

          {/* Itemized Payment Details */}
          <div className="receipt-amount-section rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden print:border-slate-300">
            <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3 border-b border-slate-200 dark:border-slate-700 print:bg-slate-100">
              <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 print:text-slate-800">
                Payment Details
              </h3>
            </div>
            <div className="p-5 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Price Per Day:</span>
                <span className="font-semibold">Rs. {receipt.payment?.pricePerDay || receipt.rental?.pricePerDay}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Number of Days:</span>
                <span className="font-semibold">{receipt.payment?.numberOfDays || receipt.rental?.durationDays || receipt.rental?.days}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Payment Method:</span>
                <span className="font-semibold">{receipt.payment?.paymentMethod || receipt.payment?.method}</span>
              </div>
              <div className="flex justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Transaction ID:</span>
                <span className="font-mono text-xs">{receipt.payment?.transactionId || receipt.payment?.transaction_id}</span>
              </div>
              <p className="flex justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Payment Status: </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs print:bg-transparent print:text-slate-900">
                  {paymentStatusText}
                </span>
              </p>
              <p className="flex justify-between gap-4 py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Payment Date: </span>
                <span className="font-semibold">{receipt.payment?.paymentDate}</span>
              </p>
              <p className="flex justify-between items-center gap-4 pt-3 text-base sm:text-lg">
                <span className="font-display font-extrabold text-slate-900 dark:text-white print:text-slate-900">Total Amount: </span>
                <span className="font-black text-brand-red">Rs. {receipt.payment?.totalAmount || receipt.payment?.amount}</span>
              </p>
            </div>
          </div>

          {/* Print Action */}
          <div className="receipt-print-btn no-print text-center pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-darkRed text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-glow transition-all cursor-pointer"
            >
              <i className="fa-solid fa-print text-xs"></i>
              <span>Print Receipt</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
