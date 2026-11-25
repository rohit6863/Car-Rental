import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import api from '../api/client';

export default function Header() {
  const { user, logout } = useAuth();
  const { openModal } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
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

  // Theme toggle initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('wanderwheels_theme');
    if (savedTheme === 'dark' || (!savedTheme && (document.documentElement.classList.contains('dark-atmosphere') || document.body.classList.contains('dark-atmosphere')))) {
      document.documentElement.classList.add('dark-atmosphere');
      document.body.classList.add('dark-atmosphere');
      setIsDarkMode(true);
    }
  }, []);

  // Scroll progress listener
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        setScrollProgress((totalScroll / windowHeight) * 100);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark-atmosphere');
      document.body.classList.add('dark-atmosphere');
      localStorage.setItem('wanderwheels_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-atmosphere');
      document.body.classList.remove('dark-atmosphere');
      localStorage.setItem('wanderwheels_theme', 'light');
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    setUserDropdownOpen(false);
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

  const openLoginModal = (e) => {
    if (e?.preventDefault) e.preventDefault();
    openModal('login', e?.currentTarget || null);
  };

  return (
    <header className="w-full flex flex-col transition-colors">
      {/* 1. Top Support & Brand Bar */}
      <div className="surface-card bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 text-xs py-2.5 transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand Logo & Tagline */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-brand-red p-0.5 shadow-md group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-brand-dark rounded-[14px] flex flex-col items-center justify-center relative overflow-hidden">
                <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="28" r="18" fill="url(#sunGradTopHeader)" />
                  <path d="M10 42L24 22L35 36L43 26L54 42H10Z" fill="#1E293B" stroke="#F8FAFC" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M16 46C18 41 23 39 32 39C41 39 46 41 48 46H16Z" fill="#E11D48" />
                  <circle cx="22" cy="46" r="4" fill="#F8FAFC" stroke="#0F172A" strokeWidth="2" />
                  <circle cx="42" cy="46" r="4" fill="#F8FAFC" stroke="#0F172A" strokeWidth="2" />
                  <defs>
                    <linearGradient id="sunGradTopHeader" x1="32" y1="10" x2="32" y2="46" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FBBF24" />
                      <stop offset="1" stopColor="#EA580C" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
            <div>
              <span className="text-adaptive-main font-display font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 block leading-none">
                WANDER<span className="text-brand-red">WHEELS</span>
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-bold block mt-1">
                Self-Drive Car Rental Fleet
              </span>
            </div>
          </Link>

          {/* Support Contacts */}
          <div className="hidden lg:flex items-center space-x-6">
            <a href={`mailto:${contactInfo.EmailId}`} className="flex items-center gap-3 group">
              <span className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:border-brand-red group-hover:bg-brand-red group-hover:text-white transition-all">
                <i className="fa-solid fa-envelope text-xs"></i>
              </span>
              <div>
                <span className="text-adaptive-main block text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  FOR SUPPORT MAIL US :
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-brand-red transition-colors">
                  {contactInfo.EmailId}
                </span>
              </div>
            </a>

            <a href={`tel:${contactInfo.ContactNo}`} className="flex items-center gap-3 group">
              <span className="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 group-hover:border-brand-red group-hover:bg-brand-red group-hover:text-white transition-all">
                <i className="fa-solid fa-phone text-xs"></i>
              </span>
              <div>
                <span className="text-adaptive-main block text-[10px] font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  SERVICE HELPLINE CALL US:
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-brand-red transition-colors">
                  {contactInfo.ContactNo}
                </span>
              </div>
            </a>
          </div>

          {/* Socials, Dark Mode Toggle & Login Button */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-brand-dark hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-brand-red dark:hover:text-white flex items-center justify-center transition-colors"
                aria-label="X (Twitter)"
              >
                <i className="fa-brands fa-x-twitter text-xs"></i>
              </a>
              <a
                href="https://www.linkedin.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-brand-dark hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-brand-red dark:hover:text-white flex items-center justify-center transition-colors"
                aria-label="LinkedIn"
              >
                <i className="fa-brands fa-linkedin-in text-xs"></i>
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-brand-dark hover:text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-brand-red dark:hover:text-white flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <i className="fa-brands fa-instagram text-xs"></i>
              </a>
            </div>

            {/* Showroom Dark/Light Atmosphere Toggle */}
            <button
              onClick={toggleTheme}
              id="themeToggleBtn"
              type="button"
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700 transition-all focus:outline-none"
              title="Toggle Dark Showroom Mode"
              aria-label="Toggle Dark Mode"
            >
              <i id="themeToggleIcon" className={`fa-solid ${isDarkMode ? 'fa-sun text-amber-500' : 'fa-moon'} text-xs`}></i>
            </button>

            {/* Authenticated Welcome or Single Login Button */}
            {user ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
                <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>
                <span>Welcome To WanderWheels</span>
              </span>
            ) : (
              <div className="login_btn">
                <a
                  href="#loginform"
                  onClick={openLoginModal}
                  data-testid="header-login-btn"
                  className="bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg shadow-sm transition-all inline-block text-center cursor-pointer"
                >
                  Login / Register
                </a>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. Main Sticky Navigation Bar + Scroll Progress */}
      <nav id="navigation_bar" className="sticky top-0 z-40 glass-nav border-b border-slate-800 shadow-lg text-slate-200">
        {/* Scroll Progress Line */}
        <div
          id="scrollProgressBar"
          className="h-0.5 bg-gradient-to-r from-brand-red via-amber-400 to-brand-emerald transition-all duration-100"
          style={{ width: `${scrollProgress}%` }}
        ></div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1" id="navigation">
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  location.pathname === '/' || location.pathname === '/index.php'
                    ? 'text-white bg-brand-red shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Home
              </Link>
              <Link
                to="/page/aboutus"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  location.pathname.includes('aboutus')
                    ? 'text-white bg-brand-red shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                About Us
              </Link>
              <Link
                to="/car-listing"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  location.pathname.includes('car-listing') || location.pathname.includes('search-carresult')
                    ? 'text-white bg-brand-red shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Car Listing
              </Link>
              <Link
                to="/page/faqs"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  location.pathname.includes('faqs')
                    ? 'text-white bg-brand-red shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                FAQs
              </Link>
              <Link
                to="/contact-us"
                className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  location.pathname.includes('contact-us')
                    ? 'text-white bg-brand-red shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Contact Us
              </Link>
            </div>

            {/* Right: Search + User Profile Menu */}
            <div className="flex items-center space-x-3 ml-auto">
              
              {/* Header Search Box */}
              <form onSubmit={handleSearchSubmit} id="header-search-form" className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Search car brand or title..."
                  className="w-44 md:w-56 bg-slate-900/90 text-white placeholder-slate-400 text-xs font-medium rounded-lg pl-3.5 pr-9 py-2 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-red transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-red transition-colors"
                  aria-label="Submit Search"
                >
                  <i className="fa-solid fa-magnifying-glass text-xs"></i>
                </button>
              </form>

              {/* User Profile Menu */}
              <div className="user_login relative">
                <button
                  type="button"
                  data-testid="header-account-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="h-10 px-3 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none"
                  aria-expanded={userDropdownOpen}
                >
                  <i className="fa-solid fa-circle-user text-brand-red text-base"></i>
                  <span>
                    {user ? (user.fullname || user.FullName || user.email) : 'Account'}
                  </span>
                  <i className="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 text-xs font-semibold text-slate-200">
                    {user ? (
                      <>
                        <div className="px-4 py-2 border-b border-slate-800 mb-1">
                          <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Logged In</p>
                          <p className="font-bold text-white text-sm truncate">{user.fullname || user.FullName || user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800 transition-colors block text-slate-200"
                        >
                          <i className="fa-solid fa-user-gear text-brand-red w-4"></i> Profile Settings
                        </Link>
                        <Link
                          to="/update-password"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800 transition-colors block text-slate-200"
                        >
                          <i className="fa-solid fa-key text-amber-400 w-4"></i> Update Password
                        </Link>
                        <Link
                          to="/my-booking"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800 transition-colors block text-slate-200"
                        >
                          <i className="fa-solid fa-calendar-check text-emerald-400 w-4"></i> My Booking
                        </Link>
                        <div className="border-t border-slate-800 my-1"></div>
                        <a
                          href="#logout"
                          onClick={handleLogout}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-rose-400 hover:bg-slate-800 font-bold transition-colors block"
                        >
                          <i className="fa-solid fa-right-from-bracket w-4"></i> Sign Out
                        </a>
                      </>
                    ) : (
                      <>
                        <a
                          href="#loginform"
                          data-testid="header-dropdown-profile"
                          onClick={(e) => { setUserDropdownOpen(false); openLoginModal(e); }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800 transition-colors block text-slate-200"
                        >
                          <i className="fa-solid fa-user-gear text-brand-red w-4"></i> Profile Settings
                        </a>
                        <a
                          href="#loginform"
                          data-testid="header-dropdown-password"
                          onClick={(e) => { setUserDropdownOpen(false); openLoginModal(e); }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800 transition-colors block text-slate-200"
                        >
                          <i className="fa-solid fa-key text-amber-400 w-4"></i> Update Password
                        </a>
                        <a
                          href="#loginform"
                          data-testid="header-dropdown-booking"
                          onClick={(e) => { setUserDropdownOpen(false); openLoginModal(e); }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-800 transition-colors block text-slate-200"
                        >
                          <i className="fa-solid fa-calendar-check text-emerald-400 w-4"></i> My Booking
                        </a>
                        <div className="border-t border-slate-800 my-1"></div>
                        <a
                          href="#loginform"
                          data-testid="header-dropdown-login"
                          onClick={(e) => { setUserDropdownOpen(false); openLoginModal(e); }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-brand-red hover:bg-slate-800 font-bold transition-colors block"
                        >
                          <i className="fa-solid fa-arrow-right-to-bracket w-4"></i> Login / Register
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center border border-slate-700 focus:outline-none"
                aria-label="Toggle Mobile Menu"
              >
                <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
              </button>

            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg bg-slate-800 text-white text-center"
              >
                Home
              </Link>
              <Link
                to="/car-listing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg bg-slate-800 text-white text-center"
              >
                Car Listing
              </Link>
              <Link
                to="/page/aboutus"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-center"
              >
                About Us
              </Link>
              <Link
                to="/page/faqs"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-center"
              >
                FAQs
              </Link>
              <Link
                to="/contact-us"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-center col-span-2"
              >
                Contact Us
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
