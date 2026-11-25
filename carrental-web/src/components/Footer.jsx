import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    <footer id="portalFooter" className="bg-brand-darker text-slate-400 pt-14 pb-10 border-t border-slate-800 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          
          {/* Brand & Overview */}
          <div className="space-y-3">
            <span className="font-display font-extrabold text-xl text-white block">
              WANDER<span className="text-brand-red">WHEELS</span>
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Premier car rental portal offering verified self-drive vehicles across sedans, SUVs, and luxury fleet with guaranteed quality and transparent rates.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-brand-dark hover:text-white text-slate-400 flex items-center justify-center border border-slate-800 transition-colors"
                aria-label="X"
              >
                <i className="fa-brands fa-x-twitter text-xs"></i>
              </a>
              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-brand-dark hover:text-white text-slate-400 flex items-center justify-center border border-slate-800 transition-colors"
                aria-label="LinkedIn"
              >
                <i className="fa-brands fa-linkedin-in text-xs"></i>
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-brand-dark hover:text-white text-slate-400 flex items-center justify-center border border-slate-800 transition-colors"
                aria-label="Instagram"
              >
                <i className="fa-brands fa-instagram text-xs"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home Page</Link>
              </li>
              <li>
                <Link to="/car-listing" className="hover:text-white transition-colors">Car Listing</Link>
              </li>
              <li>
                <Link to="/page/aboutus" className="hover:text-white transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/page/faqs" className="hover:text-white transition-colors">Frequently Asked Questions</Link>
              </li>
              <li>
                <Link to="/contact-us" className="hover:text-white transition-colors">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Direct Support */}
          <div>
            <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider mb-3">
              Direct Support
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                Mail: <a href={`mailto:${contactInfo.EmailId}`} className="text-slate-200 hover:text-brand-red transition-colors">{contactInfo.EmailId}</a>
              </li>
              <li>
                Helpline: <a href={`tel:${contactInfo.ContactNo}`} className="text-slate-200 hover:text-brand-red transition-colors">{contactInfo.ContactNo}</a>
              </li>
              <li>
                <Link to="/page/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/page/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div>
            <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider mb-3">
              Subscribe Newsletter
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Subscribe to get latest fleet additions, exclusive discounts, and travel updates.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                name="subscriberemail"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-brand-red"
                required
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                name="emailsubscibe"
                className="w-full py-2.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                disabled={submitting}
              >
                <span>{submitting ? 'Subscribing...' : 'Subscribe'}</span>
                <i className="fa-solid fa-angle-right text-xs"></i>
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} WanderWheels Car Rental Portal. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <Link to="/page/privacy" className="hover:text-slate-400 transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/page/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/contact-us" className="hover:text-slate-400 transition-colors">Support</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
