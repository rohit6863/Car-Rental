import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import api, { getVehicleImageUrl } from '../api/client';

export default function HomePage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVehicles() {
      try {
        const res = await api.get('/api/vehicles');
        setVehicles(res.data);
      } catch (err) {
        console.error('Failed to load vehicles', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  return (
    <>
      <Header />

      {/* Banners */}
      <section id="banner" className="banner-section">
        <div className="container">
          <div className="div_zindex">
            <div className="row">
              <div className="col-md-5 col-md-push-7">
                <div className="banner_content">
                  <h1>Find the right car for you.</h1>
                  <p>We have more than a thousand cars for you to choose. </p>
                  <Link to="/car-listing" className="btn">
                    Read More{' '}
                    <span className="angle_arrow">
                      <i className="fa fa-angle-right" aria-hidden="true"></i>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* /Banners */}

      {/* Resent Cat */}
      <section className="section-padding gray-bg">
        <div className="container">
          <div className="section-header text-center">
            <h2>
              Find the Best <span>CarForYou</span>
            </h2>
            <p style={{ whiteSpace: 'pre-line' }}>
              {`At WanderWheels, we believe every adventure deserves the perfect ride. Whether you're exploring a new city, embarking on a road trip, or just need a reliable set of wheels, we've got you covered. With a wide selection of well-maintained vehicles, flexible rental options, and unbeatable prices, we make hitting the road effortless.

Why Choose WanderWheels?
✔ Variety of Vehicles – From compact cars to spacious SUVs
✔ Affordable Rates – Competitive pricing with no hidden fees
✔ Easy Booking – Quick online reservations & 24/7 support
✔ Seamless Experience – Pick-up and drop-off made simple

Start your journey with WanderWheels today – where freedom meets the open road! Rent. Drive. Explore.`}
            </p>
          </div>
          <div className="row">
            {/* Nav tabs */}
            <div className="recent-tab">
              <ul className="nav nav-tabs" role="tablist">
                <li role="presentation" className="active">
                  <a href="#resentnewcar" role="tab" data-toggle="tab">
                    New Car
                  </a>
                </li>
              </ul>
            </div>
            {/* Recently Listed New Cars */}
            <div className="tab-content">
              <div role="tabpanel" className="tab-pane active" id="resentnewcar">
                {loading ? (
                  <div className="text-center" style={{ padding: '40px' }}>
                    Loading vehicles...
                  </div>
                ) : (
                  vehicles.map((v) => (
                    <div className="col-list-3" key={v.id}>
                      <div className="recent-car-list">
                        <div className="car-info-box">
                          <Link to={`/vehical-details/${v.id}`}>
                            <img
                              src={getVehicleImageUrl(v.Vimage1)}
                              className="img-responsive"
                              alt="image"
                              style={{ width: '100%', height: '220px', objectFit: 'cover' }}
                            />
                          </Link>
                          <ul>
                            <li>
                              <i className="fa fa-car" aria-hidden="true"></i>
                              {v.FuelType}
                            </li>
                            <li>
                              <i className="fa fa-calendar" aria-hidden="true"></i>
                              {v.ModelYear} Model
                            </li>
                            <li>
                              <i className="fa fa-user" aria-hidden="true"></i>
                              {v.SeatingCapacity} seats
                            </li>
                          </ul>
                        </div>
                        <div className="car-title-m">
                          <h6>
                            <Link to={`/vehical-details/${v.id}`}>
                              {v.BrandName} , {v.VehiclesTitle}
                            </Link>
                          </h6>
                          <span className="price">Rs.{v.PricePerDay} /Day</span>
                        </div>
                        <div className="inventory_info_m">
                          <p>{v.VehiclesOverview ? v.VehiclesOverview.substring(0, 70) : ''}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* /Resent Cat */}

      <Footer />

      {/* Back to top */}
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
