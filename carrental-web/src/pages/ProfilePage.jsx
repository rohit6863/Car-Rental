import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    fullname: '',
    mobilenumber: '',
    dob: '',
    address: '',
    city: '',
    country: '',
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('notice') === 'missing_contact') {
        setNotice('Please provide your contact number to complete your profile.');
      }
    }
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get('/api/users/profile');
        setProfile(res.data);
        setFormData({
          fullname: res.data.FullName || '',
          mobilenumber: res.data.ContactNo || '',
          dob: res.data.dob || '',
          address: res.data.Address || '',
          city: res.data.City || '',
          country: res.data.Country || '',
        });
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    }
    fetchProfile();
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
      const res = await api.put('/api/users/profile', formData);
      setMsg(res.data.message || 'Profile Updated Successfully');
      // Update local profile view
      setProfile((prev) => ({
        ...prev,
        FullName: formData.fullname,
        ContactNo: formData.mobilenumber,
        dob: formData.dob,
        Address: formData.address,
        City: formData.city,
        Country: formData.country,
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-darker text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Header />

      {/* Subbanner */}
      <section className="page-header profile_page relative subbanner-overlay py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-darker via-brand-dark to-brand-slate opacity-95"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">Your Profile</h1>
            </div>
            <ul className="coustom-breadcrumb flex items-center gap-2 text-xs md:text-sm text-slate-300 mt-2 font-medium">
              <li>
                <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
              </li>
              <li className="text-slate-400">/</li>
              <li className="text-brand-amber font-semibold">Profile</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      {/* Profile Content */}
      <section className="user_profile inner_pages flex-1 py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* User Header Summary Card */}
          <div className="user_profile_info gray-bg mb-8 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 transition-colors">
            <div className="upload_user_logo w-20 h-20 rounded-2xl bg-brand-red/10 border-2 border-brand-red/20 flex items-center justify-center p-2 flex-shrink-0">
              <img src="/assets/images/user-avatar.svg" alt="User Avatar" className="w-14 h-14 object-contain" />
            </div>
            <div className="dealer_info text-center sm:text-left flex-1">
              <h5 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-1">
                {profile ? profile.FullName : user?.fullname}
              </h5>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {profile?.Address && <span>{profile.Address}<br /></span>}
                {profile?.City && <span>{profile.City}&nbsp;</span>}
                {profile?.Country && <span>{profile.Country}</span>}
                {!profile?.Address && !profile?.City && !profile?.Country && (
                  <span className="italic">No address provided yet</span>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-4">
              <Sidebar active="profile" />
            </div>

            {/* Profile Form Container */}
            <div className="lg:col-span-8">
              <div className="profile_wrap bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                  <h5 className="uppercase underline font-display text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                    GENERAL SETTINGS
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Manage your account identity, contact information and preferences
                  </p>
                </div>

                {(notice || (profile && !profile.ContactNo)) && (
                  <div className="errorWrap mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 text-blue-800 dark:text-blue-300 text-sm shadow-xs">
                    <strong>NOTICE</strong>: {notice || 'Please provide your contact number to complete your profile.'}
                  </div>
                )}
                {msg && (
                  <div className="succWrap mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-300 text-sm shadow-xs">
                    <strong>SUCCESS</strong>: {msg}
                  </div>
                )}
                {error && (
                  <div className="errorWrap mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 text-rose-800 dark:text-rose-300 text-sm shadow-xs">
                    <strong>ERROR</strong>: {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Metadata display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-brand-dark/50 border border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                    <div className="form-group">
                      <label className="control-label font-bold text-slate-700 dark:text-slate-300 mr-2">Reg Date -</label>
                      <span>{profile?.RegDate || 'N/A'}</span>
                    </div>

                    {profile?.UpdationDate && (
                      <div className="form-group">
                        <label className="control-label font-bold text-slate-700 dark:text-slate-300 mr-2">Last Update at -</label>
                        <span>{profile.UpdationDate}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label htmlFor="fullname" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Full Name <span className="text-brand-red">*</span>
                      </label>
                      <input
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        name="fullname"
                        value={formData.fullname}
                        id="fullname"
                        type="text"
                        required
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="email" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Email Address
                      </label>
                      <input
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-brand-dark/50 text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
                        value={profile?.EmailId || user?.email || ''}
                        name="emailid"
                        id="email"
                        type="email"
                        required
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label htmlFor="phone-number" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Phone Number <span className="text-brand-red">*</span>
                      </label>
                      <input
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        name="mobilenumber"
                        value={formData.mobilenumber}
                        id="phone-number"
                        type="text"
                        required
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="birth-date" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Date of Birth (dd/mm/yyyy)
                      </label>
                      <input
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        value={formData.dob}
                        name="dob"
                        placeholder="dd/mm/yyyy"
                        id="birth-date"
                        type="text"
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Your Address
                    </label>
                    <textarea
                      className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                      name="address"
                      rows="3"
                      value={formData.address}
                      onChange={handleChange}
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label htmlFor="city" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        City
                      </label>
                      <input
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        id="city"
                        name="city"
                        value={formData.city}
                        type="text"
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="country" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                        Country
                      </label>
                      <input
                        className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        id="country"
                        name="country"
                        value={formData.country}
                        type="text"
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group pt-4">
                    <button
                      type="submit"
                      name="updateprofile"
                      className="btn px-6 py-3 bg-brand-red hover:bg-brand-darkRed text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-glow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      disabled={loading}
                    >
                      <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      <span className="angle_arrow">
                        <i className="fa fa-angle-right" aria-hidden="true"></i>
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
