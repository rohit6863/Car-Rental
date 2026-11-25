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

  // Driver KYC state
  const [kycDl, setKycDl] = useState('');
  const [kycFile, setKycFile] = useState(null);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycMsg, setKycMsg] = useState('');
  const [kycError, setKycError] = useState('');

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
        setKycDl(res.data.drivingLicenseNo || res.data.DrivingLicenseNo || '');
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

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycError('');
    setKycMsg('');
    if (!kycDl.trim()) {
      setKycError('Please enter your Driving License number.');
      return;
    }
    setKycSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('drivingLicenseNo', kycDl.trim());
      if (kycFile) {
        payload.append('kycDocument', kycFile);
      }
      const res = await api.post('/api/users/kyc', payload);
      setKycMsg(res.data?.message || 'Driving License KYC submitted and queued for verification.');
      setKycFile(null);
      if (res.data?.kyc) {
        setProfile((prev) => ({
          ...(prev || {}),
          DrivingLicenseNo: res.data.kyc.drivingLicenseNo,
          drivingLicenseNo: res.data.kyc.drivingLicenseNo,
          KycStatus: res.data.kyc.kycStatus,
          kycStatus: res.data.kyc.kycStatus,
          KycSubmittedAt: res.data.kyc.kycSubmittedAt,
          kycSubmittedAt: res.data.kyc.kycSubmittedAt,
          KycRejectionReason: null,
          kycRejectionReason: null,
          hasKycDocument: res.data.kyc.hasKycDocument,
          kycDocumentUrl: res.data.kyc.kycDocumentUrl,
        }));
      }
    } catch (err) {
      const details = err.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setKycError(details.map((d) => d.message).join('. '));
      } else {
        setKycError(err.response?.data?.error || 'Failed to submit KYC details');
      }
    } finally {
      setKycSubmitting(false);
    }
  };

  const rawKycStatus = profile?.kycStatus || profile?.KycStatus || 'Pending';
  const kycSubmittedAt = profile?.kycSubmittedAt || profile?.KycSubmittedAt || null;
  const kycRejectionReason = profile?.kycRejectionReason || profile?.KycRejectionReason || null;
  const kycDisplayStatus =
    rawKycStatus === 'Verified'
      ? 'Verified'
      : rawKycStatus === 'Rejected'
      ? 'Rejected'
      : kycSubmittedAt
      ? 'Pending Review'
      : 'Not Submitted';

  return (
    <div className="min-h-screen bg-brand-light dark:bg-brand-darker text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Header />

      {/* Subbanner */}
      <section className="page-header profile_page relative subbanner-overlay py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-darker via-brand-dark to-brand-slate opacity-95"></div>
        <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
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

              {/* Driver KYC Verification Section */}
              <div className="mt-8 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                  <div>
                    <h5 className="uppercase font-display text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                      Driver KYC Verification
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Submit your Driving License details for fast self-drive pickup verification
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-auto ${
                      kycDisplayStatus === 'Verified'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : kycDisplayStatus === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                        : kycDisplayStatus === 'Pending Review'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {kycDisplayStatus}
                  </span>
                </div>

                {kycMsg && (
                  <div className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-300 text-sm">
                    <strong>SUCCESS</strong>: {kycMsg}
                  </div>
                )}
                {kycError && (
                  <div className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500 text-rose-800 dark:text-rose-300 text-sm">
                    <strong>ERROR</strong>: {kycError}
                  </div>
                )}

                {kycDisplayStatus === 'Pending Review' && kycSubmittedAt && (
                  <div className="mb-5 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                    <strong>Received:</strong> Submitted on {new Date(kycSubmittedAt).toLocaleString()} &mdash; awaiting admin verification. You can update your submission below if needed.
                  </div>
                )}

                {kycDisplayStatus === 'Rejected' && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300">
                    <strong>Verification Rejected:</strong> {kycRejectionReason || 'Please check your Driving License details and resubmit.'}
                  </div>
                )}

                {kycDisplayStatus === 'Verified' ? (
                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-sm text-emerald-800 dark:text-emerald-300 space-y-1">
                    <div className="font-bold">Your Driving License is verified.</div>
                    <div className="text-xs">
                      License No: <span className="font-mono font-semibold">{kycDl || 'On File'}</span>
                      {kycSubmittedAt && (
                        <span> &bull; Verified submission from {new Date(kycSubmittedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleKycSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label
                          htmlFor="kyc-dl-input"
                          className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block"
                        >
                          Driving License Number <span className="text-brand-red">*</span>
                        </label>
                        <input
                          id="kyc-dl-input"
                          name="drivingLicenseNo"
                          type="text"
                          required
                          value={kycDl}
                          onChange={(e) => setKycDl(e.target.value)}
                          placeholder="e.g. MH12 20210048291"
                          className="form-control white_bg w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-brand-dark text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition-all"
                        />
                      </div>

                      <div className="form-group">
                        <label
                          htmlFor="kyc-doc-input"
                          className="control-label text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block"
                        >
                          Driving License Photo (JPG/PNG/WEBP, max 5 MB)
                        </label>
                        <input
                          id="kyc-doc-input"
                          name="kycDocument"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                          className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 cursor-pointer"
                        />
                        {kycFile ? (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
                            Selected: {kycFile.name}
                          </p>
                        ) : profile?.hasKycDocument ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                            Document already uploaded on file. Upload a new photo to replace it.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={kycSubmitting}
                        className="btn px-6 py-2.5 bg-brand-red hover:bg-brand-darkRed text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-glow inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span>{kycSubmitting ? 'Submitting KYC...' : kycDisplayStatus === 'Pending Review' ? 'Update KYC Submission' : 'Submit KYC for Verification'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
