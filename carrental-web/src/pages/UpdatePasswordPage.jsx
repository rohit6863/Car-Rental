import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'asdfghjkl1',
  'admin123456',
  'administrator',
  'letmein123',
  'welcome1234',
  'iloveyou123',
  'changeme123',
]);

export default function UpdatePasswordPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState('');
  const [newpassword, setNewpassword] = useState('');
  const [confirmpassword, setConfirmpassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/api/users/profile');
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to load profile', err);
      }
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!password) {
      setError('Current password is required');
      return;
    }

    if (newpassword !== confirmpassword) {
      setError('Passwords do not match');
      return;
    }

    if (newpassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newpassword.length > 128) {
      setError('Password cannot exceed 128 characters');
      return;
    }

    if (COMMON_PASSWORDS.has(newpassword.toLowerCase())) {
      setError('Password is too common or easily guessed. Please choose a stronger password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.put('/api/users/password', {
        password,
        newpassword,
        confirmpassword,
      });
      setMsg(res.data.message || 'Your Password successfully changed');
      setPassword('');
      setNewpassword('');
      setConfirmpassword('');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Your current password is wrong');
      }
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
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="page-header_wrap">
            <div className="page-heading">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-white tracking-tight">Update Password</h1>
            </div>
            <ul className="coustom-breadcrumb flex items-center gap-2 text-xs md:text-sm text-slate-300 mt-2 font-medium">
              <li>
                <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
              </li>
              <li className="text-slate-400">/</li>
              <li className="text-brand-amber font-semibold">Update Password</li>
            </ul>
          </div>
        </div>
        <div className="dark-overlay"></div>
      </section>

      {/* Main Content */}
      <section className="user_profile inner_pages flex-1 py-10 md:py-14">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* User Header Summary Card */}
          <div className="user_profile_info gray-bg mb-8 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 transition-colors">
            <div className="upload_user_logo w-20 h-20 rounded-2xl bg-brand-red/10 border-2 border-brand-red/20 flex items-center justify-center p-2 flex-shrink-0">
              <img src="/assets/images/user-avatar.svg" alt="User Avatar" className="w-14 h-14 object-contain" />
            </div>
            <div className="dealer_info text-center sm:text-left flex-1">
              <h5 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-1">
                {profile?.FullName || user?.fullname}
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
              <Sidebar active="password" />
            </div>

            {/* Password Form Container */}
            <div className="lg:col-span-8">
              <div className="profile_wrap bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
                <form name="chngpwd" onSubmit={handleSubmit} className="space-y-6">
                  <div className="gray-bg field-title border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                    <h6 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      Update password
                    </h6>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Choose a strong, unique password with at least 8 characters
                    </p>
                  </div>

                  {error && (
                    <div className="errorWrap p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 text-rose-800 dark:text-rose-300 text-sm shadow-xs">
                      <strong>ERROR</strong>:{error}
                    </div>
                  )}
                  {msg && (
                    <div className="succWrap p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-300 text-sm shadow-xs">
                      <strong>SUCCESS</strong>:{msg}
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="password" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Current Password <span className="text-brand-red">*</span>
                    </label>
                    <input
                      className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newpassword" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                      New Password <span className="text-brand-red">*</span>
                    </label>
                    <input
                      className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                      id="newpassword"
                      type="password"
                      name="newpassword"
                      required
                      value={newpassword}
                      onChange={(e) => setNewpassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmpassword" className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Confirm Password <span className="text-brand-red">*</span>
                    </label>
                    <input
                      className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                      id="confirmpassword"
                      type="password"
                      name="confirmpassword"
                      required
                      value={confirmpassword}
                      onChange={(e) => setConfirmpassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group pt-4">
                    <input
                      type="submit"
                      value={loading ? 'Updating...' : 'Update'}
                      name="update"
                      id="submit"
                      className="btn btn-block w-full sm:w-auto px-6 py-3 bg-brand-red hover:bg-brand-darkRed text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-glow cursor-pointer disabled:opacity-50"
                      disabled={loading}
                    />
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
