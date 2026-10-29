import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const res = await api.post('/api/newsletter/subscribe', { subscriberemail: email });
      alert(res.data.message || 'Subscribed successfully.');
      setEmail('');
    } catch (err) {
      alert(err.response?.data?.error || 'Something went wrong. Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer>
      <div className="footer-top">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h6>About Us</h6>
              <ul>
                <li>
                  <Link to="/page/aboutus">About Us</Link>
                </li>
                <li>
                  <Link to="/page/faqs">FAQs</Link>
                </li>
                <li>
                  <Link to="/page/privacy">Privacy</Link>
                </li>
                <li>
                  <Link to="/page/terms">Terms of use</Link>
                </li>
              </ul>
            </div>
            <div className="col-md-3 col-sm-6">
              <h6>Subscribe Newsletter</h6>
              <div className="newsletter-form">
                <form onSubmit={handleSubscribe}>
                  <div className="form-group">
                    <input
                      type="email"
                      name="subscriberemail"
                      className="form-control newsletter-input"
                      required
                      placeholder="Enter Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" name="emailsubscibe" className="btn btn-block" disabled={submitting}>
                    Subscribe <span className="angle_arrow"><i className="fa fa-angle-right" aria-hidden="true"></i></span>
                  </button>
                </form>
                <p className="subscribed-text">*We send great deals and latest auto news to our subscribed users very week.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <div className="row">
            <div className="col-md-6 col-md-push-6 text-right">
              <div className="footer_widget">
                <p>Connect with Us:</p>
                <ul>
                  <li>
                    <a href="https://x.com" target="_blank" rel="noopener noreferrer">
                      <svg width="16" height="16" viewBox="0 0 22 22">
                        <path
                          fill="currentColor"
                          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                        />
                      </svg>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/feed/" target="_blank" rel="noopener noreferrer">
                      <i className="fa fa-linkedin-square" aria-hidden="true"></i>
                    </a>
                  </li>
                  <li>
                    <a href="https://www.instagram.com//" target="_blank" rel="noopener noreferrer">
                      <i className="fa fa-instagram" aria-hidden="true"></i>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-md-6 col-md-pull-6">
              <p className="copy-right">WandarWheels &copy; {new Date().getFullYear()} - All Rights Reserved</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
