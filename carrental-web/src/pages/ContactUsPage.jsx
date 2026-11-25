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
    Address: '100 Business Park, Suite 400, Pune, Maharashtra, India',
    EmailId: 'support@example.com',
    ContactNo: '+91 99999 00000',
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
    <div className="min-h-screen bg-brand-light dark:bg-brand-darker text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Header />

      {/* Subbanner */}
      <section className="page-header contactus_page relative subbanner-overlay py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-darker via-brand-dark to-brand-slate opacity-95"></div>
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">Contact Us</h1>
            </div>
            <ul className="coustom-breadcrumb flex items-center gap-2 text-xs md:text-sm text-slate-300 mt-2 font-medium">
              <li>
                <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
              </li>
              <li className="text-slate-400">/</li>
              <li className="text-brand-amber font-semibold">Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      {/* Contact Section */}
      <section className="contact_us section-padding flex-1 py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Contact Form */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Get in touch using the form below
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Have a question about our fleet, rates, or bookings? Send us a message and our team will get back to you promptly.
                </p>

                {error && (
                  <div className="errorWrap mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 text-rose-800 dark:text-rose-300 text-sm shadow-xs">
                    <strong>ERROR</strong>: {error}
                  </div>
                )}
                {msg && (
                  <div className="succWrap mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-300 text-sm shadow-xs">
                    <strong>SUCCESS</strong>: {msg}
                  </div>
                )}

                <div className="contact_form gray-bg">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="form-group">
                      <label className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Full Name <span className="text-brand-red">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullname"
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        required
                        value={formData.fullname}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="form-group">
                        <label className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                          Email Address <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                          required
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="form-group">
                        <label className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                          Phone Number <span className="text-brand-red">*</span>
                        </label>
                        <input
                          type="text"
                          name="contactno"
                          className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                          required
                          value={formData.contactno}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Message <span className="text-brand-red">*</span>
                      </label>
                      <textarea
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        name="message"
                        rows="4"
                        required
                        value={formData.message}
                        onChange={handleChange}
                      ></textarea>
                    </div>

                    <div className="form-group pt-2">
                      <button
                        className="btn px-6 py-3 bg-brand-red hover:bg-brand-darkRed text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-glow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        type="submit"
                        disabled={loading}
                      >
                        <span>{loading ? 'Sending...' : 'Send Message'}</span>
                        <span className="angle_arrow">
                          <i className="fa fa-angle-right" aria-hidden="true"></i>
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Contact Details Card */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
                <h3 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-6">
                  Contact Info
                </h3>
                <div className="contact_detail">
                  <ul className="space-y-6">
                    <li className="flex items-start gap-4">
                      <div className="icon_wrap w-11 h-11 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center flex-shrink-0 text-lg">
                        <i className="fa fa-map-marker" aria-hidden="true"></i>
                      </div>
                      <div className="contact_info_m flex-1 pt-1 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {contactInfo.Address}
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="icon_wrap w-11 h-11 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center flex-shrink-0 text-lg">
                        <i className="fa fa-phone" aria-hidden="true"></i>
                      </div>
                      <div className="contact_info_m flex-1 pt-2 text-sm">
                        <a href={`tel:${contactInfo.ContactNo}`} className="text-slate-700 dark:text-slate-300 hover:text-brand-red dark:hover:text-brand-red transition-colors font-semibold">
                          {contactInfo.ContactNo}
                        </a>
                      </div>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="icon_wrap w-11 h-11 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center flex-shrink-0 text-lg">
                        <i className="fa fa-envelope-o" aria-hidden="true"></i>
                      </div>
                      <div className="contact_info_m flex-1 pt-2 text-sm">
                        <a href={`mailto:${contactInfo.EmailId}`} className="text-slate-700 dark:text-slate-300 hover:text-brand-red dark:hover:text-brand-red transition-colors font-semibold">
                          {contactInfo.EmailId}
                        </a>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Additional Hub / Support Information */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
                  <p className="flex items-center gap-2">
                    <i className="fa fa-clock-o text-brand-amber"></i>
                    <span>Operational Hours: 24/7 Fleet Dispatch & Customer Care</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="fa fa-shield text-brand-emerald"></i>
                    <span>Verified Insurance & Roadside Assistance Available</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <div id="back-top" className="back-top fixed bottom-6 right-6 z-40">
        <a
          href="#top"
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="w-11 h-11 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white flex items-center justify-center shadow-lg transition-all"
          aria-label="Back to top"
        >
          <i className="fa fa-angle-up text-lg" aria-hidden="true"></i>
        </a>
      </div>

      <LoginModal />
      <SignupModal />
      <ForgotPasswordModal />
    </div>
  );
}
