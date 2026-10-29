import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import flatpickr from 'flatpickr';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import { useAuth } from '../context/AuthContext';
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
  const [fromDateStatus, setFromDateStatus] = useState(null); // { available: boolean, text: string }
  const [toDateStatus, setToDateStatus] = useState(null);
  const [availability, setAvailability] = useState({ checked: false, available: false, message: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

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
        const isBooked = currentBookedDates.includes(normFrom);
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
        const isBooked = currentBookedDates.includes(normTo);
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
    evaluateDates(val, toDateInputRef.current, vehicleRef.current, bookedDatesRef.current);
  };

  // Handler for manual typing / change in To Date
  const handleToDateChange = (val) => {
    toDateInputRef.current = val;
    setToDateInput(val);
    evaluateDates(fromDateInputRef.current, val, vehicleRef.current, bookedDatesRef.current);
  };

  // Handler for blur event
  const handleDateBlur = () => {
    evaluateDates(fromDateInputRef.current, toDateInputRef.current, vehicleRef.current, bookedDatesRef.current);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingSuccess('');
    setBookingError('');

    if (!user) {
      if (window.$) window.$('#loginform').modal('show');
      return;
    }

    if (validationError) {
      setBookingError(validationError);
      return;
    }

    if (!availability.available) {
      setBookingError(availability.message || 'Vehicle is not available for selected dates');
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
      <>
        <Header />
        <div style={{ padding: '80px 0', textAlign: 'center' }}>Loading vehicle details...</div>
        <Footer />
      </>
    );
  }

  // Collect available images
  const images = [vehicle.Vimage1, vehicle.Vimage2, vehicle.Vimage3, vehicle.Vimage4, vehicle.Vimage5].filter(Boolean);

  return (
    <>
      <Header />

      {/* Embedded Flatpickr & Datepicker Legacy Styles */}
      <style>{`
        .date-picker-wrapper {
          position: relative;
          margin-bottom: 15px;
        }
        .date-picker-wrapper .form-control {
          background-color: #fff;
          border: 1px solid #ced4da;
          border-radius: 4px;
          padding: 10px 15px;
          width: 100%;
          color: #495057;
          font-size: 14px;
          height: 45px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .flatpickr-calendar {
          background: #fff;
          border: 1px solid #ddd;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .flatpickr-day {
          border-radius: 4px;
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }
        .flatpickr-day.selected {
          background: #007bff;
          border-color: #007bff;
        }
        .flatpickr-day:hover {
          background: #f0f0f0;
        }
        .flatpickr-day.disabled {
          background-color: #ffebee !important;
          color: #dc3545 !important;
          text-decoration: line-through;
          opacity: 0.7;
        }
        .flatpickr-current-month {
          font-size: 16px;
          color: #333;
        }
        .flatpickr-weekday {
          color: #666;
          font-weight: 600;
        }
        .date-status {
          margin-top: 8px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
        }
        .date-status.available {
          background-color: #e8f5e9;
          color: #2e7d32;
          display: block;
          border: 1px solid #c8e6c9;
        }
        .date-status.unavailable {
          background-color: #ffebee;
          color: #c62828;
          display: block;
          border: 1px solid #ffcdd2;
        }
        .date-legend {
          margin-top: 15px;
          padding: 12px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .legend-color {
          width: 20px;
          height: 20px;
          margin-right: 10px;
          border-radius: 3px;
        }
        .legend-available {
          background-color: #fff;
          border: 1px solid #ddd;
        }
        .legend-unavailable {
          background-color: #ffebee;
          border: 1px solid #ffcdd2;
        }
      `}</style>

      {/* Listing-Image-Slider */}
      <section id="listing_img_slider" style={{ background: '#222', textAlign: 'center', padding: '10px 0' }}>
        <div className="container">
          {images.length > 0 && (
            <img
              src={getVehicleImageUrl(images[activeImageIndex])}
              className="img-responsive"
              alt="vehicle"
              style={{ maxHeight: '520px', margin: '0 auto', objectFit: 'contain' }}
            />
          )}
          {images.length > 1 && (
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={getVehicleImageUrl(img)}
                  alt="thumbnail"
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    width: '80px',
                    height: '50px',
                    objectFit: 'cover',
                    cursor: 'pointer',
                    border: idx === activeImageIndex ? '2px solid #ed1b24' : '1px solid #555',
                    borderRadius: '3px',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Listing-detail */}
      <section className="listing-detail">
        <div className="container">
          <div className="listing_detail_head row">
            <div className="col-md-9">
              <h2>
                {vehicle.BrandName} , {vehicle.VehiclesTitle}
              </h2>
            </div>
            <div className="col-md-3">
              <div className="price_info">
                <p>Rs.{vehicle.PricePerDay} </p>Per Day
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-9">
              <div className="main_features">
                <ul>
                  <li>
                    <i className="fa fa-calendar" aria-hidden="true"></i>
                    <h5>{vehicle.ModelYear}</h5>
                    <p>Reg.Year</p>
                  </li>
                  <li>
                    <i className="fa fa-cogs" aria-hidden="true"></i>
                    <h5>{vehicle.FuelType}</h5>
                    <p>Fuel Type</p>
                  </li>
                  <li>
                    <i className="fa fa-user-plus" aria-hidden="true"></i>
                    <h5>{vehicle.SeatingCapacity}</h5>
                    <p>Seats</p>
                  </li>
                </ul>
              </div>

              <div className="listing_more_info">
                <div className="listing_detail_wrap">
                  {/* Nav tabs */}
                  <ul className="nav nav-tabs gray-bg" role="tablist">
                    <li role="presentation" className={activeTab === 'overview' ? 'active' : ''}>
                      <a href="#vehicle-overview" onClick={(e) => { e.preventDefault(); setActiveTab('overview'); }}>
                        Vehicle Overview
                      </a>
                    </li>
                    <li role="presentation" className={activeTab === 'accessories' ? 'active' : ''}>
                      <a href="#accessories" onClick={(e) => { e.preventDefault(); setActiveTab('accessories'); }}>
                        Accessories
                      </a>
                    </li>
                  </ul>

                  {/* Tab panes */}
                  <div className="tab-content">
                    {/* vehicle-overview */}
                    <div
                      role="tabpanel"
                      className={`tab-pane ${activeTab === 'overview' ? 'active' : ''}`}
                      id="vehicle-overview"
                    >
                      <p>{vehicle.VehiclesOverview}</p>
                    </div>

                    {/* Accessories */}
                    <div
                      role="tabpanel"
                      className={`tab-pane ${activeTab === 'accessories' ? 'active' : ''}`}
                      id="accessories"
                    >
                      <table>
                        <thead>
                          <tr>
                            <th colSpan="2">Accessories</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Air Conditioner</td>
                            <td>
                              {vehicle.AirConditioner === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>AntiLock Braking System</td>
                            <td>
                              {vehicle.AntiLockBrakingSystem === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Power Steering</td>
                            <td>
                              {vehicle.PowerSteering === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Power Windows</td>
                            <td>
                              {vehicle.PowerWindows === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>CD Player</td>
                            <td>
                              {vehicle.CDPlayer === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Leather Seats</td>
                            <td>
                              {vehicle.LeatherSeats === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Central Locking</td>
                            <td>
                              {vehicle.CentralLocking === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Power Door Locks</td>
                            <td>
                              {vehicle.PowerDoorLocks === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Brake Assist</td>
                            <td>
                              {vehicle.BrakeAssist === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Driver Airbag</td>
                            <td>
                              {vehicle.DriverAirbag === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Passenger Airbag</td>
                            <td>
                              {vehicle.PassengerAirbag === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td>Crash Sensor</td>
                            <td>
                              {vehicle.CrashSensor === 1 ? (
                                <i className="fa fa-check" aria-hidden="true"></i>
                              ) : (
                                <i className="fa fa-close" aria-hidden="true"></i>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side-Bar */}
            <aside className="col-md-3">
              <div className="share_vehicle">
                <p>
                  Share:{' '}
                  <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">
                    <i className="fa fa-facebook-square" aria-hidden="true"></i>
                  </a>
                  <a href="https://x.com" target="_blank" rel="noopener noreferrer">
                    <svg width="15" height="15" viewBox="0 0 22 22" style={{ verticalAlign: 'middle', marginLeft: '5px' }}>
                      <path
                        fill="currentColor"
                        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                      />
                    </svg>
                  </a>
                  <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: '5px' }}>
                    <i className="fa fa-linkedin-square" aria-hidden="true"></i>
                  </a>
                </p>
              </div>

              <div className="sidebar_widget">
                <div className="widget_heading">
                  <h5 style={{ color: '#fff' }}>
                    <i className="fa fa-envelope" aria-hidden="true" style={{ color: '#fff', marginRight: '8px' }}></i> Book Now
                  </h5>
                </div>
                <form id="bookingForm" onSubmit={handleBookingSubmit}>
                  {/* From Date */}
                  <div className="form-group">
                    <label htmlFor="fromdate">
                      <i className="fa fa-calendar" style={{ marginRight: '5px' }}></i> From Date:
                    </label>
                    <div className="date-picker-wrapper">
                      <input
                        type="text"
                        className="form-control"
                        name="fromdate"
                        id="fromdate"
                        placeholder="Select start date"
                        required
                        ref={fromDateRef}
                        value={fromDateInput}
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
                    <label htmlFor="todate">
                      <i className="fa fa-calendar" style={{ marginRight: '5px' }}></i> To Date:
                    </label>
                    <div className="date-picker-wrapper">
                      <input
                        type="text"
                        className="form-control"
                        name="todate"
                        id="todate"
                        placeholder="Select end date"
                        required
                        ref={toDateRef}
                        value={toDateInput}
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

                  {/* Clear validation message */}
                  {validationError && (
                    <div className="alert alert-warning" style={{ fontSize: '13px', padding: '10px', marginBottom: '15px' }}>
                      {validationError}
                    </div>
                  )}

                  {/* Server Availability Result */}
                  {availability.checked && !validationError && (
                    <div
                      id="availability-status"
                      className={`alert ${availability.available ? 'alert-success' : 'alert-danger'}`}
                      style={{ display: 'block', fontSize: '13px', padding: '10px', marginBottom: '15px' }}
                    >
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

                  {/* Duration and Total Summary in Booking Widget */}
                  <div className="booking-summary" style={{ margin: '15px 0', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 6px' }}>
                      <strong>Price per day:</strong> Rs.{vehicle.PricePerDay}
                    </p>
                    <p style={{ margin: '0 0 6px' }}>
                      <strong>Duration:</strong> <span id="numberOfDays">{days} days</span>
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Total Amount:</strong> <span id="totalAmount">Rs. {totalAmount}</span>
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Message:</label>
                    <textarea
                      rows="4"
                      className="form-control"
                      name="message"
                      id="message"
                      placeholder="Message"
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    ></textarea>
                  </div>

                  {user ? (
                    <div className="form-group">
                      <input
                        type="submit"
                        className="btn"
                        name="submit"
                        value={bookingLoading ? 'Booking...' : 'Book Now'}
                        disabled={bookingLoading}
                      />
                    </div>
                  ) : (
                    <a
                      href="#loginform"
                      className="btn btn-xs uppercase"
                      data-toggle="modal"
                      data-dismiss="modal"
                    >
                      Login For Book
                    </a>
                  )}

                  {bookingSuccess && (
                    <div className="alert alert-success" style={{ fontSize: '13px', padding: '12px', marginTop: '15px' }}>
                      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{bookingSuccess}</p>
                      <Link to="/my-booking" className="btn btn-xs btn-primary">
                        View My Bookings &rarr;
                      </Link>
                    </div>
                  )}

                  {bookingError && (
                    <div className="alert alert-danger" style={{ fontSize: '13px', padding: '10px', marginTop: '15px' }}>
                      {bookingError}
                    </div>
                  )}
                </form>
              </div>

              {/* Second Booking Summary Box (matching legacy) */}
              <div className="sidebar_widget">
                <div className="widget_heading">
                  <h5>
                    <i className="fa fa-calculator" aria-hidden="true"></i> Booking Summary
                  </h5>
                </div>
                <div className="booking-summary-content" style={{ padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 6px' }}>
                    <strong>Price per day:</strong> Rs.{vehicle.PricePerDay}
                  </p>
                  <p style={{ margin: '0 0 6px' }}>
                    <strong>Duration:</strong> <span id="numberOfDays2">{days} days</span>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Total Amount:</strong> <span id="totalAmount2">Rs. {totalAmount}</span>
                  </p>
                </div>
              </div>
            </aside>
          </div>

          <div className="space-20"></div>
          <div className="divider"></div>

          {/* Similar-Cars */}
          <div className="similar_cars">
            <h3>Similar Cars</h3>
            <div className="row">
              {similarCars.length === 0 ? (
                <div className="col-md-12">
                  <p>No similar cars found.</p>
                </div>
              ) : (
                similarCars.map((car) => (
                  <div className="col-md-3 grid_listing" key={car.id}>
                    <div className="product-listing-m gray-bg">
                      <div className="product-listing-img">
                        <Link to={`/vehical-details/${car.id}`}>
                          <img src={getVehicleImageUrl(car.Vimage1)} className="img-responsive" alt="image" />
                        </Link>
                      </div>
                      <div className="product-listing-content">
                        <h5>
                          <Link to={`/vehical-details/${car.id}`}>
                            {car.BrandName} , {car.VehiclesTitle}
                          </Link>
                        </h5>
                        <p className="list-price">Rs.{car.PricePerDay}</p>
                        <div className="car-location">
                          <span>
                            <i className="fa fa-user-plus" aria-hidden="true"></i> {car.SeatingCapacity} seats
                          </span>
                          <span>
                            <i className="fa fa-calendar" aria-hidden="true"></i> {car.ModelYear} model
                          </span>
                          <span>
                            <i className="fa fa-car" aria-hidden="true"></i> {car.FuelType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </>
  );
}
