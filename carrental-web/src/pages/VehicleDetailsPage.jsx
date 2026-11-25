import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import flatpickr from 'flatpickr';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import api, { getVehicleImageUrl } from '../api/client';

/**
 * Normalizes user-typed or picker date input to YYYY-MM-DD.
 * Supports:
 *   - YYYY-MM-DD, YYYY/MM/DD
 *   - DD/MM/YYYY, DD-MM-YYYY
 *   - Standard date strings (e.g. November 1, 2026)
 * Returns null if invalid or unparseable.
 */
export function parseAndNormalizeDate(input) {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return input.toISOString().split('T')[0];
  }
  const str = String(input).trim();
  if (!str) return null;

  // 1. YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // 2. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return null;
  }

  // 3. Fallback standard parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = parsed.getMonth() + 1;
    const d = parsed.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return null;
}

export default function VehicleDetailsPage() {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get('vhid') || searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openModal } = useModal();

  const [vehicle, setVehicle] = useState(null);
  const [similarCars, setSimilarCars] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Raw input values as typed by user or selected in picker
  const [fromDateInput, setFromDateInput] = useState('');
  const [toDateInput, setToDateInput] = useState('');

  // Validated & normalized dates (YYYY-MM-DD)
  const [normalizedFromDate, setNormalizedFromDate] = useState('');
  const [normalizedToDate, setNormalizedToDate] = useState('');

  // Form states
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [fromDateStatus, setFromDateStatus] = useState(null);
  const [toDateStatus, setToDateStatus] = useState(null);
  const [availability, setAvailability] = useState({ checked: false, available: false, message: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Flatpickr refs
  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);
  const fpFrom = useRef(null);
  const fpTo = useRef(null);

  // Synchronous refs to prevent stale closure issues in event listeners & pickers
  const fromDateInputRef = useRef('');
  const toDateInputRef = useRef('');
  const vehicleRef = useRef(null);
  const bookedDatesRef = useRef([]);

  useEffect(() => {
    vehicleRef.current = vehicle;
  }, [vehicle]);

  useEffect(() => {
    bookedDatesRef.current = bookedDates;
  }, [bookedDates]);

  // Load vehicle and similar cars
  useEffect(() => {
    let isMounted = true;
    async function loadVehicleDetails() {
      setLoading(true);
      try {
        const vRes = await api.get(`/api/vehicles/${id}`);
        if (isMounted) {
          setVehicle(vRes.data);
        }
      } catch (err) {
        console.error('Failed to load vehicle details', err);
      } finally {
        if (isMounted) setLoading(false);
      }

      // Fetch similar cars
      try {
        const simRes = await api.get(`/api/vehicles/${id}/similar`);
        if (isMounted) setSimilarCars(simRes.data);
      } catch (err) {
        console.warn('Could not load similar cars', err);
      }
    }

    if (id) {
      loadVehicleDetails();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Load booked dates (even if it fails, Flatpickr still initialises)
  useEffect(() => {
    let isMounted = true;
    async function loadBookedDates() {
      try {
        const bookedRes = await api.get(`/api/vehicles/${id}/booked-dates`);
        if (isMounted) {
          setBookedDates(bookedRes.data.booked_dates || []);
        }
      } catch (err) {
        console.warn('Could not load booked dates, continuing with empty list', err);
        if (isMounted) setBookedDates([]);
      }
    }

    if (id) {
      loadBookedDates();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Recalculate duration, total, validation, and availability
  const evaluateDates = useCallback(
    async (fromStr, toStr, currentVehicle, currentBookedDates) => {
      if (!fromStr && !toStr) {
        setDays(0);
        setTotalAmount(0);
        setValidationError('');
        setFromDateStatus(null);
        setToDateStatus(null);
        setAvailability({ checked: false, available: false, message: '' });
        return;
      }

      const normFrom = fromStr ? parseAndNormalizeDate(fromStr) : null;
      const normTo = toStr ? parseAndNormalizeDate(toStr) : null;

      // Update individual date availability badges if parseable
      if (normFrom) {
        const isBooked = (currentBookedDates || []).includes(normFrom);
        setFromDateStatus({
          available: !isBooked,
          text: isBooked ? 'This date is not available' : 'Date available',
        });
      } else if (fromStr) {
        setFromDateStatus({ available: false, text: 'Invalid date format' });
      } else {
        setFromDateStatus(null);
      }

      if (normTo) {
        const isBooked = (currentBookedDates || []).includes(normTo);
        setToDateStatus({
          available: !isBooked,
          text: isBooked ? 'This date is not available' : 'Date available',
        });
      } else if (toStr) {
        setToDateStatus({ available: false, text: 'Invalid date format' });
      } else {
        setToDateStatus(null);
      }

      // Check if both dates are provided
      if (!fromStr || !toStr) {
        setDays(0);
        setTotalAmount(0);
        setValidationError('');
        setAvailability({ checked: false, available: false, message: '' });
        return;
      }

      // If either date failed to normalize
      if (!normFrom || !normTo) {
        setDays(0);
        setTotalAmount(0);
        setValidationError('Please enter valid dates (YYYY-MM-DD or DD/MM/YYYY)');
        setAvailability({ checked: false, available: false, message: '' });
        return;
      }

      // Validate date order
      if (normFrom >= normTo) {
        setDays(0);
        setTotalAmount(0);
        setValidationError('End date must be after start date');
        setAvailability({ checked: false, available: false, message: '' });
        return;
      }

      // Clear any prior validation error
      setValidationError('');
      setNormalizedFromDate(normFrom);
      setNormalizedToDate(normTo);

      // Compute inclusive days and total
      const start = new Date(normFrom + 'T00:00:00');
      const end = new Date(normTo + 'T00:00:00');
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      setDays(diffDays);
      const price = currentVehicle ? currentVehicle.PricePerDay : 0;
      setTotalAmount(diffDays * price);

      // Check server availability
      if (currentVehicle?.id) {
        try {
          const res = await api.post('/api/vehicles/check-availability', {
            vehicle_id: currentVehicle.id,
            from_date: normFrom,
            to_date: normTo,
          });
          setAvailability({ checked: true, available: res.data.available, message: res.data.message });
        } catch (err) {
          setAvailability({
            checked: true,
            available: false,
            message: err.response?.data?.message || 'Error checking availability',
          });
        }
      }
    },
    []
  );

  // Initialize Flatpickr when inputs are in DOM
  useEffect(() => {
    if (!fromDateRef.current || !toDateRef.current) return;

    // Cleanup existing instances before re-init
    if (fpFrom.current) {
      try {
        fpFrom.current.destroy();
      } catch (e) {}
      fpFrom.current = null;
    }
    if (fpTo.current) {
      try {
        fpTo.current.destroy();
      } catch (e) {}
      fpTo.current = null;
    }

    const baseConfig = {
      minDate: 'today',
      dateFormat: 'Y-m-d',
      allowInput: true,
      disable: bookedDates,
      parseDate: (dateStr) => {
        const norm = parseAndNormalizeDate(dateStr);
        if (norm) {
          return new Date(norm + 'T00:00:00');
        }
        return undefined;
      },
    };

    fpFrom.current = flatpickr(fromDateRef.current, {
      ...baseConfig,
      onChange: (selectedDates, dateStr) => {
        fromDateInputRef.current = dateStr;
        setFromDateInput(dateStr);
        if (fpTo.current && selectedDates[0]) {
          fpTo.current.set('minDate', selectedDates[0]);
        }
        evaluateDates(dateStr, toDateInputRef.current, vehicleRef.current, bookedDatesRef.current);
      },
    });

    fpTo.current = flatpickr(toDateRef.current, {
      ...baseConfig,
      onChange: (selectedDates, dateStr) => {
        toDateInputRef.current = dateStr;
        setToDateInput(dateStr);
        evaluateDates(fromDateInputRef.current, dateStr, vehicleRef.current, bookedDatesRef.current);
      },
    });

    return () => {
      if (fpFrom.current) {
        try {
          fpFrom.current.destroy();
        } catch (e) {}
        fpFrom.current = null;
      }
      if (fpTo.current) {
        try {
          fpTo.current.destroy();
        } catch (e) {}
        fpTo.current = null;
      }
    };
  }, [loading, vehicle?.id]); // Re-run as soon as loading completes and inputs mount

  // Update disabled booked dates on existing Flatpickr instances when bookedDates arrive
  useEffect(() => {
    if (fpFrom.current) {
      fpFrom.current.set('disable', bookedDates);
    }
    if (fpTo.current) {
      fpTo.current.set('disable', bookedDates);
    }
    // Re-evaluate current dates against newly loaded booked dates
    if (fromDateInputRef.current || toDateInputRef.current) {
      evaluateDates(fromDateInputRef.current, toDateInputRef.current, vehicleRef.current, bookedDates);
    }
  }, [bookedDates]);

  // Handler for manual typing / change in From Date
  const handleFromDateChange = (val) => {
    fromDateInputRef.current = val;
    setFromDateInput(val);
    const norm = parseAndNormalizeDate(val);
    if (norm && fpFrom.current) {
      fpFrom.current.setDate(norm, false);
      fpFrom.current.close();
    }
    evaluateDates(val, toDateInputRef.current, vehicleRef.current, bookedDatesRef.current);
  };

  // Handler for manual typing / change in To Date
  const handleToDateChange = (val) => {
    toDateInputRef.current = val;
    setToDateInput(val);
    const norm = parseAndNormalizeDate(val);
    if (norm && fpTo.current) {
      fpTo.current.setDate(norm, false);
      fpTo.current.close();
    }
    evaluateDates(fromDateInputRef.current, val, vehicleRef.current, bookedDatesRef.current);
  };

  // Handler for blur event
  const handleDateBlur = () => {
    evaluateDates(fromDateInputRef.current, toDateInputRef.current, vehicleRef.current, bookedDatesRef.current);
  };

  // Form submission
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    setBookingSuccess('');

    if (!user) {
      openModal('login');
      return;
    }

    if (!normalizedFromDate || !normalizedToDate) {
      setValidationError('Please enter valid dates (YYYY-MM-DD or DD/MM/YYYY)');
      return;
    }

    if (normalizedFromDate > normalizedToDate) {
      setValidationError('End date must be after start date');
      return;
    }

    setBookingLoading(true);
    try {
      const res = await api.post('/api/bookings', {
        vehicle_id: vehicle.id,
        fromdate: normalizedFromDate,
        todate: normalizedToDate,
        message,
      });
      setBookingLoading(false);
      setBookingSuccess(res.data.message || 'Booking successful! Your booking is pending admin confirmation.');
      setFromDateInput('');
      setToDateInput('');
      setMessage('');
      setDays(0);
      setTotalAmount(0);
      setAvailability({ checked: false, available: false, message: '' });
      if (fpFrom.current) fpFrom.current.clear();
      if (fpTo.current) fpTo.current.clear();
    } catch (err) {
      setBookingLoading(false);
      setBookingError(err.response?.data?.error || err.response?.data?.message || 'Something went wrong. Please try again');
    }
  };

  if (loading || !vehicle) {
    return (
      <div className="min-h-screen flex flex-col bg-brand-light transition-colors">
        <Header />
        <div className="flex-grow flex items-center justify-center py-20 text-slate-500 font-semibold">
          <i className="fa-solid fa-spinner fa-spin text-brand-red text-2xl mr-2"></i>
          <span>Loading vehicle details...</span>
        </div>
        <Footer />
      </div>
    );
  }

  // Collect available images
  const images = [vehicle.Vimage1, vehicle.Vimage2, vehicle.Vimage3, vehicle.Vimage4, vehicle.Vimage5].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-brand-light transition-colors">
      <Header />

      {/* Flatpickr Scoped Styles */}
      <style>{`
        .date-picker-wrapper {
          position: relative;
          margin-bottom: 12px;
        }
        .flatpickr-calendar {
          background: #fff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          border-radius: 12px;
          z-index: 1000;
        }
        .flatpickr-day {
          border-radius: 8px;
          font-size: 13px;
          color: #1e293b;
          font-weight: 600;
        }
        .flatpickr-day.selected {
          background: #E11D48 !important;
          border-color: #E11D48 !important;
          color: #fff !important;
        }
        .flatpickr-day:hover {
          background: #f1f5f9;
        }
        .flatpickr-day.disabled {
          background-color: #ffebee !important;
          color: #dc2626 !important;
          text-decoration: line-through;
          opacity: 0.7;
        }
        .flatpickr-current-month {
          font-size: 15px;
          color: #0f172a;
          font-weight: 700;
        }
        .flatpickr-weekday {
          color: #64748b;
          font-weight: 700;
          font-size: 11px;
        }
        .date-status {
          margin-top: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
        }
        .date-status.available {
          background-color: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          display: block;
        }
        .date-status.unavailable {
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          display: block;
        }
        .date-legend {
          margin-top: 14px;
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }
        .legend-item:last-child {
          margin-bottom: 0;
        }
        .legend-color {
          width: 16px;
          height: 16px;
          margin-right: 8px;
          border-radius: 4px;
        }
        .legend-available {
          background-color: #fff;
          border: 1px solid #cbd5e1;
        }
        .legend-unavailable {
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
        }
      `}</style>

      <main className="flex-grow">
        {/* Sub-Banner Header */}
        <section className="relative h-44 sm:h-52 bg-slate-950 flex items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 subbanner-overlay"></div>
          <div className="relative z-10 px-4">
            <span className="px-3 py-1 rounded-full bg-brand-red/20 text-brand-red text-xs font-extrabold uppercase tracking-wider border border-brand-red/30 mb-2 inline-block">
              {vehicle.BrandName}
            </span>
            <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
              {vehicle.VehiclesTitle}
            </h1>
            <nav className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium mt-2">
              <Link to="/" className="hover:text-brand-red transition-colors">Home</Link>
              <i className="fa-solid fa-chevron-right text-[10px] text-slate-500"></i>
              <Link to="/car-listing" className="hover:text-brand-red transition-colors">Fleet</Link>
              <i className="fa-solid fa-chevron-right text-[10px] text-slate-500"></i>
              <span className="text-white font-semibold">{vehicle.VehiclesTitle}</span>
            </nav>
          </div>
        </section>

        {/* Vehicle Showcase Section */}
        <section className="py-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Main Showcase Card */}
          <div className="surface-card bg-white rounded-3xl border border-slate-200/90 shadow-card p-6 sm:p-8 transition-colors">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Image Viewer */}
              <div className="lg:col-span-7 space-y-4">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg flex items-center justify-center">
                  {images.length > 0 ? (
                    <img
                      src={getVehicleImageUrl(images[activeImageIndex])}
                      alt={vehicle.VehiclesTitle}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-slate-600 font-semibold text-sm">No image available</div>
                  )}
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wider border border-white/10">
                    {vehicle.BrandName}
                  </span>
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-20 h-14 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border-2 transition-all ${
                          idx === activeImageIndex
                            ? 'border-brand-red ring-2 ring-brand-red/30'
                            : 'border-slate-200 hover:border-slate-400 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={getVehicleImageUrl(img)}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Title, 3 Specs Cards, Pricing */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Premium Self-Drive
                  </span>
                  <h2 className="text-adaptive-main font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">
                    {vehicle.BrandName} , {vehicle.VehiclesTitle}
                  </h2>
                  <div className="mt-3 inline-flex items-baseline gap-1.5 px-4 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-brand-red">
                    <span className="text-2xl font-black">Rs. {vehicle.PricePerDay}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">/ Day</span>
                  </div>
                </div>

                {/* 3 Core Specs Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="surface-muted bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-center">
                    <i className="fa-solid fa-calendar text-brand-red text-base mb-1 block"></i>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{vehicle.ModelYear}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Model Year</p>
                  </div>
                  <div className="surface-muted bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-center">
                    <i className="fa-solid fa-gas-pump text-amber-500 text-base mb-1 block"></i>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{vehicle.FuelType}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Fuel Type</p>
                  </div>
                  <div className="surface-muted bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-center">
                    <i className="fa-solid fa-user-group text-blue-500 text-base mb-1 block"></i>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">{vehicle.SeatingCapacity}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">Seats</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p>
                    {vehicle.VehiclesOverview || 'Verified luxury performance vehicle with premium safety features and 24/7 roadside assistance.'}
                  </p>
                </div>

                {/* Jump to Booking CTA */}
                <a
                  href="#bookingForm"
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-brand-red dark:bg-slate-800 dark:hover:bg-brand-red text-white hover:text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-calendar-check text-xs"></i>
                  <span>Configure Dates Below</span>
                </a>
              </div>

            </div>
          </div>

          {/* Details & Booking Section (2-Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 8 Cols: Tabs (Overview & Accessories) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="surface-card bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden transition-colors">
                
                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-4 gap-4 text-xs font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-2 border-b-2 transition-all ${
                      activeTab === 'overview'
                        ? 'border-brand-red text-brand-red'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Vehicle Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('accessories')}
                    className={`pb-3 px-2 border-b-2 transition-all ${
                      activeTab === 'accessories'
                        ? 'border-brand-red text-brand-red'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Accessories & Features
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6 sm:p-8">
                  {activeTab === 'overview' ? (
                    <div className="text-slate-700 text-sm leading-relaxed space-y-4">
                      <p>{vehicle.VehiclesOverview || 'No description available for this vehicle.'}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                      {[
                        { label: 'Air Conditioner', val: vehicle.AirConditioner },
                        { label: 'AntiLock Braking System (ABS)', val: vehicle.AntiLockBrakingSystem },
                        { label: 'Power Steering', val: vehicle.PowerSteering },
                        { label: 'Power Windows', val: vehicle.PowerWindows },
                        { label: 'CD / Multimedia Player', val: vehicle.CDPlayer },
                        { label: 'Leather Seats', val: vehicle.LeatherSeats },
                        { label: 'Central Locking', val: vehicle.CentralLocking },
                        { label: 'Power Door Locks', val: vehicle.PowerDoorLocks },
                        { label: 'Brake Assist', val: vehicle.BrakeAssist },
                        { label: 'Driver Airbag', val: vehicle.DriverAirbag },
                        { label: 'Passenger Airbag', val: vehicle.PassengerAirbag },
                        { label: 'Crash Sensor', val: vehicle.CrashSensor },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span>{item.label}</span>
                          {item.val === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                              <i className="fa-solid fa-check"></i>
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs">
                              <i className="fa-solid fa-xmark"></i>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Right 5 Cols: Booking Form Widget */}
            <aside className="lg:col-span-5 xl:col-span-4 space-y-6">
              <div className="surface-card bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden transition-colors">
                
                {/* Header */}
                <div className="bg-brand-dark px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <i className="fa-solid fa-calendar-check text-brand-red text-base"></i>
                    <h3 className="font-display font-extrabold text-base text-white">Book This Car</h3>
                  </div>
                  <span className="text-xs font-bold text-amber-400">Rs. {vehicle.PricePerDay}/Day</span>
                </div>

                {/* Form */}
                <form id="bookingForm" onSubmit={handleBookingSubmit} className="p-6 space-y-4">
                  
                  {/* From Date */}
                  <div className="form-group">
                    <label htmlFor="fromdate" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      <i className="fa-solid fa-calendar text-brand-red mr-1.5"></i> From Date <span className="text-brand-red">*</span>
                    </label>
                    <div className="date-picker-wrapper">
                      <input
                        type="text"
                        className="form-control w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                        name="fromdate"
                        id="fromdate"
                        placeholder="Select start date"
                        required
                        ref={fromDateRef}
                        value={fromDateInput}
                        onFocus={() => { if (fpTo.current) fpTo.current.close(); }}
                        onChange={(e) => handleFromDateChange(e.target.value)}
                        onBlur={handleDateBlur}
                      />
                      {fromDateStatus && (
                        <div id="fromDateStatus" className={`date-status ${fromDateStatus.available ? 'available' : 'unavailable'}`}>
                          {fromDateStatus.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* To Date */}
                  <div className="form-group">
                    <label htmlFor="todate" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      <i className="fa-solid fa-calendar text-brand-red mr-1.5"></i> To Date <span className="text-brand-red">*</span>
                    </label>
                    <div className="date-picker-wrapper">
                      <input
                        type="text"
                        className="form-control w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                        name="todate"
                        id="todate"
                        placeholder="Select end date"
                        required
                        ref={toDateRef}
                        value={toDateInput}
                        onFocus={() => { if (fpFrom.current) fpFrom.current.close(); }}
                        onChange={(e) => handleToDateChange(e.target.value)}
                        onBlur={handleDateBlur}
                      />
                      {toDateStatus && (
                        <div id="toDateStatus" className={`date-status ${toDateStatus.available ? 'available' : 'unavailable'}`}>
                          {toDateStatus.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Validation Error Banner */}
                  {validationError && (
                    <div className="alert alert-warning p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
                      <i className="fa-solid fa-triangle-exclamation mr-1.5 text-amber-600"></i>
                      {validationError}
                    </div>
                  )}

                  {/* Server Availability Result */}
                  {availability.checked && !validationError && (
                    <div
                      id="availability-status"
                      className={`alert p-3 rounded-xl text-xs font-semibold leading-relaxed ${
                        availability.available
                          ? 'alert-success bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'alert-danger bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      <i className={`fa-solid ${availability.available ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'} mr-1.5`}></i>
                      {availability.message}
                    </div>
                  )}

                  {/* Date Legend */}
                  <div className="date-legend">
                    <div className="legend-item">
                      <div className="legend-color legend-available"></div>
                      <span>Available Dates</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color legend-unavailable"></div>
                      <span>Booked Dates</span>
                    </div>
                  </div>

                  {/* Duration and Total Box */}
                  <div className="booking-summary p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Rate per day:</span>
                      <span className="font-bold">Rs. {vehicle.PricePerDay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-500">Duration:</span>
                      <span id="numberOfDays" className="font-extrabold text-slate-900">{days} days</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-sm">
                      <span className="font-bold text-slate-900">Total Amount:</span>
                      <span id="totalAmount" className="font-black text-brand-red">Rs. {totalAmount}</span>
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="form-group">
                    <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Booking Notes / Message <span className="text-brand-red">*</span>
                    </label>
                    <textarea
                      rows="3"
                      className="form-control w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                      name="message"
                      id="message"
                      placeholder="Special requests or pick-up instructions"
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Action Button */}
                  {user ? (
                    <div className="form-group pt-1">
                      <input
                        type="submit"
                        className="btn w-full py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-glow transition-all cursor-pointer min-h-[44px]"
                        name="submit"
                        value={bookingLoading ? 'Booking...' : 'Book Now'}
                        disabled={bookingLoading}
                      />
                    </div>
                  ) : (
                    <div className="form-group pt-1">
                      <a
                        href="#loginform"
                        data-testid="vehicle-login-btn"
                        className="btn btn-xs uppercase w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-brand-red text-white font-bold text-xs tracking-wider transition-colors block text-center min-h-[44px] flex items-center justify-center"
                        onClick={(e) => {
                          e.preventDefault();
                          openModal('login', e.currentTarget);
                        }}
                      >
                        Login For Book
                      </a>
                    </div>
                  )}

                  {/* Success Banner */}
                  {bookingSuccess && (
                    <div className="alert alert-success p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs space-y-2">
                      <p className="font-bold">{bookingSuccess}</p>
                      <Link
                        to="/my-booking"
                        className="inline-block px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white font-bold text-[11px] transition-colors"
                      >
                        View My Bookings &rarr;
                      </Link>
                    </div>
                  )}

                  {/* Error Banner */}
                  {bookingError && (
                    <div className="alert alert-danger p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold leading-relaxed">
                      <i className="fa-solid fa-circle-xmark mr-1.5 text-rose-600"></i>
                      {bookingError}
                    </div>
                  )}

                </form>

              </div>
            </aside>

          </div>

          {/* Similar Cars Section */}
          {similarCars.length > 0 && (
            <div className="pt-10 border-t border-slate-200 space-y-6">
              <h3 className="font-display font-extrabold text-xl text-slate-900">
                Similar Vehicles You May Like
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarCars.map((sc) => (
                  <div
                    key={sc.id}
                    className="surface-card group bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-xl hover:border-slate-300 transition-all overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-slate-900">
                      <Link to={`/vehical-details/${sc.id}`}>
                        <img
                          src={getVehicleImageUrl(sc.Vimage1)}
                          alt={sc.VehiclesTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </Link>
                    </div>
                    <div className="p-4 flex flex-col justify-between flex-grow space-y-3">
                      <div>
                        <h4 className="font-display font-bold text-sm text-slate-900 group-hover:text-brand-red transition-colors">
                          <Link to={`/vehical-details/${sc.id}`}>
                            {sc.BrandName ? `${sc.BrandName}, ` : ''}{sc.VehiclesTitle}
                          </Link>
                        </h4>
                        <p className="text-xs font-extrabold text-brand-red mt-1">
                          Rs. {sc.PricePerDay} <span className="text-[10px] text-slate-500 font-semibold">/ Day</span>
                        </p>
                      </div>
                      <Link
                        to={`/vehical-details/${sc.id}`}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-brand-red text-white font-bold text-xs uppercase tracking-wider transition-colors text-center block"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>
      </main>

      <Footer />

      {/* Modals */}
      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </div>
  );
}
