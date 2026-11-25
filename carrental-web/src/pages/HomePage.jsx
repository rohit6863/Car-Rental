import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import api, { getVehicleImageUrl } from '../api/client';

export default function HomePage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [vRes, bRes] = await Promise.all([
          api.get('/api/vehicles'),
          api.get('/api/brands').catch(() => ({ data: [] })),
        ]);
        if (isMounted) {
          setVehicles(vRes.data || []);
          setBrands(bRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load vehicles', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedBrand) params.append('brand', selectedBrand);
    if (selectedFuel) params.append('fuel', selectedFuel);
    navigate(`/car-listing?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      <Header />

      <main className="flex-grow">
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative bg-brand-darker overflow-hidden py-14 lg:py-20 text-white">
          {/* Hero Ambient Gradient & Grid Pattern */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 hero-gradient"></div>
            <div className="absolute inset-0 bg-radial from-brand-red/10 via-transparent to-transparent opacity-50"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Left Column: Heading & CTA */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <i className="fa-solid fa-sparkles text-xs"></i>
                  <span>Premium Self-Drive Fleet</span>
                </div>

                <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-tight">
                  FIND THE RIGHT <br />
                  <span className="text-brand-red">CAR FOR YOU.</span>
                </h1>

                <p className="text-slate-300 text-base sm:text-lg max-w-xl font-medium leading-relaxed">
                  We have more than a thousand cars for you to choose. Explore verified sedans, SUVs, and luxury models with transparent pricing and zero hidden fees.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    to="/car-listing"
                    className="bg-brand-red hover:bg-brand-darkRed text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-glow flex items-center gap-3 group transition-all"
                  >
                    <span>Explore Fleet</span>
                    <span className="w-5 h-5 rounded-full bg-white text-brand-red flex items-center justify-center group-hover:translate-x-1 transition-transform">
                      <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    </span>
                  </Link>
                  <Link
                    to="/page/aboutus"
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm px-6 py-3.5 rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
                  >
                    <span>Why WanderWheels</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Fleet Showcase Graphic Card */}
              <div className="lg:col-span-5">
                <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-slate-900/80 backdrop-blur-md p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                      WanderWheels Fleet
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase">
                      Instant Booking
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
                      <p className="text-[11px] text-slate-400 font-semibold">Self-Drive Fleet</p>
                      <p className="text-xl font-extrabold text-white mt-1">100%</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5">Inspected & Sanitized</p>
                    </div>
                    <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
                      <p className="text-[11px] text-slate-400 font-semibold">Pricing</p>
                      <p className="text-xl font-extrabold text-amber-400 mt-1">Per Day</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">Zero Hidden Charges</p>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-slate-400 leading-relaxed">
                    Book seamlessly online, pay securely via gateway, and enjoy door-to-door or hub pickup with 24/7 roadside assistance.
                  </div>
                </div>
              </div>

            </div>

            {/* QUICK SEARCH BAR */}
            <div className="surface-card bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 text-slate-900 transition-colors">
              <form onSubmit={handleQuickSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                
                {/* Brand Selector */}
                <div className="lg:col-span-5">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    <i className="fa-solid fa-car text-brand-red mr-1"></i> Select Brand
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-red"
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                  >
                    <option value="">All Brands</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.BrandName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fuel Type Selector */}
                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                    <i className="fa-solid fa-gas-pump text-amber-500 mr-1"></i> Fuel Type
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-red"
                    value={selectedFuel}
                    onChange={(e) => setSelectedFuel(e.target.value)}
                  >
                    <option value="">All Fuel Types</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="CNG">CNG</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                {/* Submit Search Button */}
                <div className="lg:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-sm uppercase tracking-wider shadow-md hover:shadow-glow transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                    <span>Find Cars</span>
                  </button>
                </div>

              </form>
            </div>

          </div>
        </section>

        {/* ==================== FEATURED FLEET SECTION ==================== */}
        <section className="py-16 sm:py-20 bg-brand-light transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            
            {/* Header & Description */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <span className="px-3.5 py-1 rounded-full bg-brand-red/10 text-brand-red text-xs font-extrabold uppercase tracking-widest border border-brand-red/20 inline-block">
                Our Showcase Fleet
              </span>
              <h2 className="text-adaptive-main font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-slate-900">
                Find the Best <span className="text-brand-red">Car For You</span>
              </h2>
              <p className="text-adaptive-sub text-sm sm:text-base text-slate-600 leading-relaxed">
                At WanderWheels, we believe every adventure deserves the perfect ride. Whether you're exploring a new city, embarking on a road trip, or just need a reliable set of wheels, we've got you covered.
              </p>
            </div>

            {/* Vehicle Grid */}
            {loading ? (
              <div className="text-center py-12 text-slate-500 font-semibold">
                <i className="fa-solid fa-spinner fa-spin text-brand-red text-2xl mb-2 block"></i>
                <span>Loading available vehicles...</span>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No vehicles available currently.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="surface-card group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-card hover:shadow-2xl hover:border-slate-300 transition-all duration-300 flex flex-col"
                  >
                    {/* Vehicle Image Container */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                      <Link to={`/vehical-details/${v.id}`} className="block w-full h-full">
                        <img
                          src={getVehicleImageUrl(v.Vimage1)}
                          alt={v.VehiclesTitle}
                          className="w-full h-full object-cover card-image-zoom"
                          loading="lazy"
                        />
                      </Link>

                      {/* Brand Badge */}
                      <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-white font-extrabold text-[11px] uppercase tracking-wider border border-white/10">
                        {v.BrandName}
                      </span>

                      {/* Price Badge */}
                      <span className="absolute bottom-3.5 right-3.5 px-3 py-1.5 rounded-xl bg-brand-red text-white font-black text-sm shadow-md">
                        Rs. {v.PricePerDay} <span className="text-[10px] font-bold uppercase opacity-85">/ Day</span>
                      </span>
                    </div>

                    {/* Vehicle Details Content */}
                    <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                      <div>
                        <h3 className="font-display font-extrabold text-lg text-slate-900 group-hover:text-brand-red transition-colors line-clamp-1">
                          <Link to={`/vehical-details/${v.id}`}>
                            {v.VehiclesTitle}
                          </Link>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {v.VehiclesOverview || 'Verified luxury performance vehicle with premium safety features.'}
                        </p>
                      </div>

                      {/* Specs Row */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-slate-600 text-[11px] font-semibold text-center">
                        <div className="flex flex-col items-center">
                          <i className="fa-solid fa-gas-pump text-amber-500 mb-1"></i>
                          <span>{v.FuelType}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <i className="fa-solid fa-calendar text-brand-red mb-1"></i>
                          <span>{v.ModelYear} Model</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <i className="fa-solid fa-user-group text-blue-500 mb-1"></i>
                          <span>{v.SeatingCapacity} Seats</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div>
                        <Link
                          to={`/vehical-details/${v.id}`}
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-brand-red text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
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

            {/* Bottom View All Link */}
            <div className="text-center pt-4">
              <Link
                to="/car-listing"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                <span>View All Fleet</span>
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </Link>
            </div>

          </div>
        </section>
      </main>

      <Footer />

      {/* Auth Modals */}
      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </div>
  );
}
