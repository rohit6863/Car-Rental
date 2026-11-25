import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import api, { getVehicleImageUrl } from '../api/client';

export default function CarListingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const brandParam = searchParams.get('brand') || '';
  const fuelParam = searchParams.get('fueltype') || searchParams.get('fuel') || '';
  const searchKeyword = searchParams.get('search') || '';

  const [vehicles, setVehicles] = useState([]);
  const [recentCars, setRecentCars] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedBrand, setSelectedBrand] = useState(brandParam);
  const [selectedFuel, setSelectedFuel] = useState(fuelParam);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [brandsRes, recentRes] = await Promise.all([
          api.get('/api/brands'),
          api.get('/api/vehicles/recent?limit=4'),
        ]);
        if (isMounted) {
          setBrands(brandsRes.data || []);
          setRecentCars(recentRes.data || []);
        }

        let vRes;
        if (brandParam && fuelParam) {
          vRes = await api.get(`/api/vehicles/search?brand=${brandParam}&fueltype=${encodeURIComponent(fuelParam)}`);
        } else {
          vRes = await api.get('/api/vehicles');
        }

        let list = vRes.data || [];
        if (searchKeyword) {
          const kw = searchKeyword.toLowerCase();
          list = list.filter((c) =>
            c.VehiclesTitle.toLowerCase().includes(kw) ||
            (c.BrandName && c.BrandName.toLowerCase().includes(kw))
          );
        }
        if (isMounted) setVehicles(list);
      } catch (err) {
        console.error('Failed to load listing data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [brandParam, fuelParam, searchKeyword]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!selectedBrand || selectedBrand === 'Select Brand' || !selectedFuel || selectedFuel === 'Select Fuel Type') {
      navigate('/car-listing');
      return;
    }
    navigate(`/car-listing?brand=${selectedBrand}&fueltype=${encodeURIComponent(selectedFuel)}`);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      <Header />

      <main className="flex-grow">
        {/* Sub-Page Hero Banner */}
        <section className="relative h-48 sm:h-56 bg-slate-950 flex items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 subbanner-overlay"></div>
          <div className="relative z-10 px-4">
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
              Car Listing
            </h1>
            <nav className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-300 font-medium mt-2">
              <Link to="/" className="hover:text-brand-red transition-colors">Home</Link>
              <i className="fa-solid fa-chevron-right text-[10px] text-slate-500"></i>
              <span className="text-white font-semibold">Car Listing</span>
            </nav>
          </div>
        </section>

        {/* Listing Page Body */}
        <section className="py-12 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDEBAR */}
            <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
              
              {/* Filter Widget */}
              <div className="surface-card bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 sm:p-6 transition-colors">
                <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
                  <i className="fa-solid fa-filter text-brand-red text-base"></i>
                  <h2 className="text-adaptive-main font-display font-extrabold text-base text-slate-900">
                    Find Your Car
                  </h2>
                </div>

                <form onSubmit={handleSearchSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Select Brand
                    </label>
                    <select
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold text-xs rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-red transition-all cursor-pointer"
                      name="brand"
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                    >
                      <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                          {b.BrandName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Select Fuel Type
                    </label>
                    <select
                      className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold text-xs rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-red transition-all cursor-pointer"
                      name="fueltype"
                      value={selectedFuel}
                      onChange={(e) => setSelectedFuel(e.target.value)}
                    >
                      <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Select Fuel Type</option>
                      <option value="Petrol" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Petrol</option>
                      <option value="Diesel" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Diesel</option>
                      <option value="CNG" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">CNG</option>
                      <option value="Electric" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Electric</option>
                      <option value="Hybrid" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">Hybrid</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    <span>Search Car</span>
                  </button>
                </form>
              </div>

              {/* Recently Listed Cars Widget */}
              <div className="surface-card bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 sm:p-6 transition-colors">
                <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
                  <i className="fa-solid fa-clock-rotate-left text-brand-red text-base"></i>
                  <h3 className="text-adaptive-main font-display font-extrabold text-base text-slate-900">
                    Recently Listed
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {recentCars.map((rc) => (
                    <div key={rc.id} className="flex items-center gap-3 group">
                      <Link to={`/vehical-details/${rc.id}`} className="w-16 h-12 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                        <img
                          src={getVehicleImageUrl(rc.Vimage1)}
                          alt={rc.VehiclesTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </Link>
                      <div className="overflow-hidden">
                        <h4 className="font-display font-bold text-xs text-slate-900 dark:text-white group-hover:text-brand-red transition-colors truncate">
                          <Link to={`/vehical-details/${rc.id}`} className="text-slate-900 dark:text-white hover:text-brand-red">
                            {rc.BrandName ? `${rc.BrandName}, ` : ''}{rc.VehiclesTitle}
                          </Link>
                        </h4>
                        <p className="text-[11px] font-extrabold text-brand-red mt-0.5">
                          Rs. {rc.PricePerDay} <span className="text-[9px] text-slate-500 font-semibold">/ Day</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </aside>

            {/* RIGHT COLUMN: VEHICLE RESULTS */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              
              {/* Results Top Bar */}
              <div className="surface-card bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-brand-emerald"></span>
                  <span>{vehicles.length} Listings Available</span>
                </div>
              </div>

              {/* Vehicle Cards List */}
              {loading ? (
                <div className="text-center py-16 text-slate-500 font-semibold">
                  <i className="fa-solid fa-spinner fa-spin text-brand-red text-2xl mb-2 block"></i>
                  <span>Loading available cars...</span>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="surface-card bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
                  <i className="fa-solid fa-car-tunnel text-4xl text-slate-300"></i>
                  <p className="text-sm font-semibold">No vehicles found matching your criteria.</p>
                  <Link to="/car-listing" className="inline-block text-xs font-bold text-brand-red hover:underline">
                    Clear all filters
                  </Link>
                </div>
              ) : (
                <div className="space-y-5">
                  {vehicles.map((v) => (
                    <div
                      key={v.id}
                      className="surface-card group bg-white rounded-2xl border border-slate-200 shadow-card hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col md:flex-row"
                    >
                      {/* Vehicle Image */}
                      <div className="md:w-72 relative aspect-[16/10] md:aspect-auto bg-slate-900 flex-shrink-0 overflow-hidden">
                        <Link to={`/vehical-details/${v.id}`} className="block w-full h-full">
                          <img
                            src={getVehicleImageUrl(v.Vimage1)}
                            alt={v.VehiclesTitle}
                            className="w-full h-full object-cover card-image-zoom"
                          />
                        </Link>
                        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider border border-white/10">
                          {v.BrandName}
                        </span>
                      </div>

                      {/* Content & Specs */}
                      <div className="p-5 flex flex-col justify-between flex-grow space-y-4">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white group-hover:text-brand-red transition-colors">
                              <Link to={`/vehical-details/${v.id}`} className="text-slate-900 dark:text-white hover:text-brand-red">
                                {v.BrandName} , {v.VehiclesTitle}
                              </Link>
                            </h3>
                            <span className="text-brand-red font-black text-base">
                              Rs. {v.PricePerDay} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ Day</span>
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {v.VehiclesOverview || 'Verified luxury performance vehicle with premium safety features.'}
                          </p>
                        </div>

                        {/* Specs Pills */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <i className="fa-solid fa-gas-pump text-amber-500"></i>
                            {v.FuelType}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <i className="fa-solid fa-calendar text-brand-red"></i>
                            {v.ModelYear} model
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            <i className="fa-solid fa-user text-blue-500"></i>
                            {v.SeatingCapacity} seats
                          </span>
                        </div>

                        {/* Action Link */}
                        <div className="pt-1 flex items-center justify-end">
                          <Link
                            to={`/vehical-details/${v.id}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-brand-red dark:bg-slate-800 dark:hover:bg-brand-red text-white hover:text-white font-bold text-xs uppercase tracking-wider transition-colors min-h-[44px]"
                          >
                            <span>View Details</span>
                            <i className="fa-solid fa-arrow-right text-[10px]"></i>
                          </Link>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
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
