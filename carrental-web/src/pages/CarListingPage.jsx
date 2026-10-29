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
    async function loadData() {
      setLoading(true);
      try {
        const [brandsRes, recentRes] = await Promise.all([
          api.get('/api/brands'),
          api.get('/api/vehicles/recent?limit=4'),
        ]);
        setBrands(brandsRes.data);
        setRecentCars(recentRes.data);

        let vRes;
        if (brandParam && fuelParam) {
          // Legacy B9: Both brand and fuel required for filtered search
          vRes = await api.get(`/api/vehicles/search?brand=${brandParam}&fueltype=${encodeURIComponent(fuelParam)}`);
        } else {
          vRes = await api.get('/api/vehicles');
        }

        let list = vRes.data;
        if (searchKeyword) {
          const kw = searchKeyword.toLowerCase();
          list = list.filter((c) =>
            c.VehiclesTitle.toLowerCase().includes(kw) ||
            c.BrandName.toLowerCase().includes(kw)
          );
        }
        setVehicles(list);
      } catch (err) {
        console.error('Failed to load listing data', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [brandParam, fuelParam, searchKeyword]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!selectedBrand || selectedBrand === 'Select Brand' || !selectedFuel || selectedFuel === 'Select Fuel Type') {
      // Legacy behavior: both required
      navigate('/car-listing');
      return;
    }
    navigate(`/car-listing?brand=${selectedBrand}&fueltype=${encodeURIComponent(selectedFuel)}`);
  };

  return (
    <>
      <Header />

      {/* Page Header */}
      <section className="page-header listing_page">
        <div className="container">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1>Car Listing</h1>
            </div>
            <ul className="coustom-breadcrumb">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>Car Listing</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>
      {/* /Page Header */}

      {/* Listing */}
      <section className="listing-page">
        <div className="container">
          <div className="row">
            <div className="col-md-9 col-md-push-3">
              <div className="result-sorting-wrapper">
                <div className="sorting-count">
                  <p>
                    <span>{vehicles.length} Listings</span>
                  </p>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>Loading vehicles...</div>
              ) : vehicles.length > 0 ? (
                vehicles.map((v) => (
                  <div className="product-listing-m gray-bg" key={v.id}>
                    <div className="product-listing-img">
                      <img
                        src={getVehicleImageUrl(v.Vimage1)}
                        className="img-responsive"
                        alt="Image"
                        style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="product-listing-content">
                      <h5>
                        <Link to={`/vehical-details/${v.id}`}>
                          {v.BrandName} , {v.VehiclesTitle}
                        </Link>
                      </h5>
                      <p className="list-price">Rs.{v.PricePerDay} Per Day</p>
                      <ul>
                        <li>
                          <i className="fa fa-user" aria-hidden="true"></i>
                          {v.SeatingCapacity} seats
                        </li>
                        <li>
                          <i className="fa fa-calendar" aria-hidden="true"></i>
                          {v.ModelYear} model
                        </li>
                        <li>
                          <i className="fa fa-car" aria-hidden="true"></i>
                          {v.FuelType}
                        </li>
                      </ul>
                      <Link to={`/vehical-details/${v.id}`} className="btn">
                        View Details{' '}
                        <span className="angle_arrow">
                          <i className="fa fa-angle-right" aria-hidden="true"></i>
                        </span>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="alert alert-info">No vehicles found matching your criteria.</div>
              )}
            </div>

            {/* Side-Bar */}
            <aside className="col-md-3 col-md-pull-9">
              <div className="sidebar_widget">
                <div className="widget_heading">
                  <h5>
                    <i className="fa fa-filter" aria-hidden="true"></i> Find Your Car{' '}
                  </h5>
                </div>
                <div className="sidebar_filter">
                  <form onSubmit={handleSearchSubmit}>
                    <div className="form-group select">
                      <select
                        className="form-control"
                        name="brand"
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                      >
                        <option value="">Select Brand</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.BrandName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group select">
                      <select
                        className="form-control"
                        name="fueltype"
                        value={selectedFuel}
                        onChange={(e) => setSelectedFuel(e.target.value)}
                      >
                        <option value="">Select Fuel Type</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="CNG">CNG</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <button type="submit" className="btn btn-block">
                        <i className="fa fa-search" aria-hidden="true"></i> Search Car
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="sidebar_widget">
                <div className="widget_heading">
                  <h5>
                    <i className="fa fa-car" aria-hidden="true"></i> Recently Listed Cars
                  </h5>
                </div>
                <div className="recent_addedcars">
                  <ul>
                    {recentCars.map((rc) => (
                      <li className="gray-bg" key={rc.id}>
                        <div className="recent_post_img">
                          <Link to={`/vehical-details/${rc.id}`}>
                            <img src={getVehicleImageUrl(rc.Vimage1)} alt="image" />
                          </Link>
                        </div>
                        <div className="recent_post_title">
                          <Link to={`/vehical-details/${rc.id}`}>
                            {rc.BrandName} , {rc.VehiclesTitle}
                          </Link>
                          <p className="widget_price">Rs.{rc.PricePerDay} Per Day</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
            {/* /Side-Bar */}
          </div>
        </div>
      </section>
      {/* /Listing */}

      <Footer />

      <div id="back-top" className="back-top">
        <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <i className="fa fa-angle-up" aria-hidden="true"></i>
        </a>
      </div>

      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </>
  );
}
