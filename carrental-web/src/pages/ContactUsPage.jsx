import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import api from '../api/client';

export default function ContactUsPage() {
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    contactno: '',
    message: '',
  });
  const [contactInfo, setContactInfo] = useState({
    Address: 'Hadapsar, Pune, Maharashtra, India',
    EmailId: 'Wheelsechiles@gmail.com',
    ContactNo: '+91-9876543210',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await api.get('/api/contact/info');
        if (res.data) setContactInfo(res.data);
      } catch (err) {
        console.error('Failed to load contact info', err);
      }
    }
    loadInfo();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const res = await api.post('/api/contact/query', formData);
      setMsg(res.data.message || 'Query Sent. We will contact you shortly');
      setFormData({ fullname: '', email: '', contactno: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <section className="page-header contactus_page">
        <div className="container">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1>Contact Us</h1>
            </div>
            <ul className="coustom-breadcrumb">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      <section className="contact_us section-padding">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h3>Get in touch using the form below</h3>
              {error && (
                <div className="errorWrap" style={{ padding: '10px', margin: '0 0 20px 0', background: '#fff', borderLeft: '4px solid #dd3d36' }}>
                  <strong>ERROR</strong>: {error}
                </div>
              )}
              {msg && (
                <div className="succWrap" style={{ padding: '10px', margin: '0 0 20px 0', background: '#fff', borderLeft: '4px solid #5cb85c' }}>
                  <strong>SUCCESS</strong>: {msg}
                </div>
              )}
              <div className="contact_form gray-bg">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="control-label">
                      Full Name <span>*</span>
                    </label>
                    <input
                      type="text"
                      name="fullname"
                      className="form-control white_bg"
                      required
                      value={formData.fullname}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="control-label">
                      Email Address <span>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-control white_bg"
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="control-label">
                      Phone Number <span>*</span>
                    </label>
                    <input
                      type="text"
                      name="contactno"
                      className="form-control white_bg"
                      required
                      value={formData.contactno}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="control-label">
                      Message <span>*</span>
                    </label>
                    <textarea
                      className="form-control white_bg"
                      name="message"
                      rows="4"
                      required
                      value={formData.message}
                      onChange={handleChange}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <button className="btn" type="submit" disabled={loading}>
                      {loading ? 'Sending...' : 'Send Message'}{' '}
                      <span className="angle_arrow">
                        <i className="fa fa-angle-right" aria-hidden="true"></i>
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="col-md-6">
              <h3>Contact Info</h3>
              <div className="contact_detail">
                <ul>
                  <li>
                    <div className="icon_wrap">
                      <i className="fa fa-map-marker" aria-hidden="true"></i>
                    </div>
                    <div className="contact_info_m">{contactInfo.Address}</div>
                  </li>
                  <li>
                    <div className="icon_wrap">
                      <i className="fa fa-phone" aria-hidden="true"></i>
                    </div>
                    <div className="contact_info_m">
                      <a href={`tel:${contactInfo.ContactNo}`}>{contactInfo.ContactNo}</a>
                    </div>
                  </li>
                  <li>
                    <div className="icon_wrap">
                      <i className="fa fa-envelope-o" aria-hidden="true"></i>
                    </div>
                    <div className="contact_info_m">
                      <a href={`mailto:${contactInfo.EmailId}`}>{contactInfo.EmailId}</a>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

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
