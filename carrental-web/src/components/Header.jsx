import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [contactInfo, setContactInfo] = useState({
    EmailId: 'support@example.com',
    ContactNo: '+91 99999 00000',
  });

  useEffect(() => {
    let isMounted = true;
    api.get('/api/contact/info').then((res) => {
      if (isMounted && res.data) {
        setContactInfo({
          EmailId: res.data.EmailId || 'support@example.com',
          ContactNo: res.data.ContactNo || '+91 99999 00000',
        });
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/car-listing?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/car-listing');
    }
  };

  return (
    <header>
      <div className="default-header">
        <div className="container">
          <div className="row">
            <div className="col-sm-3 col-md-2">
              <div className="logo">
                <Link to="/">
                  <img src="/assets/images/logo.JPG" alt="image" />
                </Link>
              </div>
            </div>
            <div className="col-sm-9 col-md-10">
              <div className="header_info">
                <div className="header_widgets">
                  <div className="circle_icon">
                    <i className="fa fa-envelope" aria-hidden="true"></i>
                  </div>
                  <p className="uppercase_text">For Support Mail us : </p>
                  <a href={`mailto:${contactInfo.EmailId}`}>{contactInfo.EmailId}</a>
                </div>
                <div className="header_widgets">
                  <div className="circle_icon">
                    <i className="fa fa-phone" aria-hidden="true"></i>
                  </div>
                  <p className="uppercase_text">Service Helpline Call Us: </p>
                  <a href={`tel:${contactInfo.ContactNo}`}>{contactInfo.ContactNo}</a>
                </div>
                <div className="social-follow">
                  <ul>
                    <li>
                      <a href="https://x.com" target="_blank" rel="noopener noreferrer">
                        <svg width="21" height="21" viewBox="0 0 22 22">
                          <path
                            fill="currentColor"
                            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                          />
                        </svg>
                      </a>
                    </li>
                    <li>
                      <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer">
                        <i className="fa fa-linkedin-square" aria-hidden="true"></i>
                      </a>
                    </li>
                    <li>
                      <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
                        <i className="fa fa-instagram" aria-hidden="true"></i>
                      </a>
                    </li>
                  </ul>
                </div>
                {!user ? (
                  <div className="login_btn">
                    <a href="#loginform" className="btn btn-xs uppercase" data-toggle="modal" data-dismiss="modal">
                      Login / Register
                    </a>
                  </div>
                ) : (
                  <span>Welcome To WanderWheels</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav id="navigation_bar" className="navbar navbar-default">
        <div className="container">
          <div className="navbar-header">
            <button
              id="menu_slide"
              data-target="#navigation"
              aria-expanded="false"
              data-toggle="collapse"
              className="navbar-toggle collapsed"
              type="button"
            >
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
          </div>
          <div className="header_wrap">
            <div className="user_login">
              <ul>
                <li className="dropdown">
                  <a href="#" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    <i className="fa fa-user-circle" aria-hidden="true"></i>
                    {user ? ` ${user.fullname || user.FullName || user.email} ` : ''}
                    <i className="fa fa-angle-down" aria-hidden="true"></i>
                  </a>
                  <ul className="dropdown-menu">
                    {user ? (
                      <>
                        <li>
                          <Link to="/profile">Profile Settings</Link>
                        </li>
                        <li>
                          <Link to="/update-password">Update Password</Link>
                        </li>
                        <li>
                          <Link to="/my-booking">My Booking</Link>
                        </li>
                        <li>
                          <a href="#logout" onClick={handleLogout}>
                            Sign Out
                          </a>
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <a href="#loginform" data-toggle="modal" data-dismiss="modal">
                            Profile Settings
                          </a>
                        </li>
                        <li>
                          <a href="#loginform" data-toggle="modal" data-dismiss="modal">
                            Update Password
                          </a>
                        </li>
                        <li>
                          <a href="#loginform" data-toggle="modal" data-dismiss="modal">
                            My Booking
                          </a>
                        </li>
                        <li>
                          <a href="#loginform" data-toggle="modal" data-dismiss="modal">
                            Sign Out
                          </a>
                        </li>
                      </>
                    )}
                  </ul>
                </li>
              </ul>
            </div>
            <div className="header_search">
              <div id="search_toggle">
                <i className="fa fa-search" aria-hidden="true"></i>
              </div>
              <form onSubmit={handleSearchSubmit} id="header-search-form">
                <input
                  type="text"
                  placeholder="Search..."
                  className="form-control"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">
                  <i className="fa fa-search" aria-hidden="true"></i>
                </button>
              </form>
            </div>
          </div>
          <div className="collapse navbar-collapse" id="navigation">
            <ul className="nav navbar-nav">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/page/aboutus">About Us</Link>
              </li>
              <li>
                <Link to="/car-listing">Car Listing</Link>
              </li>
              <li>
                <Link to="/page/faqs">FAQs</Link>
              </li>
              <li>
                <Link to="/contact-us">Contact Us</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      {/* Navigation end */}
    </header>
  );
}
