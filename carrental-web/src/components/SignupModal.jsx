import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import useModalFocusTrap from '../hooks/useModalFocusTrap';
import googleLogo from '../assets/google-logo.svg';

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

export default function SignupModal() {
  const { register, providers, user } = useAuth();
  const { activeModal, openModal, closeModal } = useModal();
  const isOpen = activeModal === 'signup';
  const dialogRef = useRef(null);

  const [formData, setFormData] = useState({
    fullname: '',
    mobileno: '',
    emailid: '',
    password: '',
    confirmpassword: '',
  });
  const [emailStatus, setEmailStatus] = useState({ text: '', color: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    closeModal('signup');
  }, [closeModal]);

  // Auto-close signup modal whenever user becomes authenticated
  useEffect(() => {
    if (user && isOpen) {
      closeModal('signup');
    }
  }, [user, isOpen, closeModal]);

  useModalFocusTrap(isOpen, dialogRef, handleClose);

  const checkEmailAvailability = async () => {
    if (!formData.emailid || !formData.emailid.includes('@')) return;
    try {
      const res = await api.get(`/api/auth/check-email?email=${encodeURIComponent(formData.emailid)}`);
      if (res.data.available) {
        setEmailStatus({ text: 'Email Available for Registration.', color: '#10B981' });
      } else {
        setEmailStatus({ text: 'Email already exists. Please choose another.', color: '#E11D48' });
      }
    } catch {
      setEmailStatus({ text: '', color: '' });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmpassword) {
      setError('Passwords do not match');
      alert('Password and Confirm Password Field do not match !!');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password.length > 128) {
      setError('Password cannot exceed 128 characters');
      return;
    }

    if (COMMON_PASSWORDS.has(formData.password.toLowerCase())) {
      setError('Password is too common or easily guessed. Please choose a stronger password.');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      closeModal('signup');
      setSuccess('');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        const msg = err.response?.data?.error || 'Something went wrong. Please try again';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = (e) => {
    e.preventDefault();
    openModal('login');
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="modal in show fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto"
      id="signupform"
      data-testid="signup-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-dialog max-w-md w-full mx-auto p-4" role="document">
        <div className="modal-content surface-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-colors">
          
          {/* Header */}
          <div className="modal-header bg-brand-dark text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div>
              <h3 id="signup-modal-title" className="modal-title font-display font-extrabold text-lg text-white">Create an Account</h3>
              <p className="text-xs text-slate-400 mt-0.5">Join WanderWheels in seconds</p>
            </div>
            <button
              type="button"
              data-testid="signup-modal-close"
              className="close w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              aria-label="Close"
              onClick={handleClose}
            >
              <span aria-hidden="true" className="text-xl leading-none">&times;</span>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body p-6">
            <div className="signup_wrap">
              {error && (
                <div className="alert alert-danger mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5 text-rose-500"></i>
                  {error}
                </div>
              )}
              {success && (
                <div className="alert alert-success mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold leading-relaxed">
                  <i className="fa-solid fa-circle-check mr-1.5 text-emerald-500"></i>
                  {success}
                </div>
              )}

              <form method="post" name="signup" onSubmit={handleSubmit} className="space-y-3.5">
                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Full Name <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    name="fullname"
                    placeholder="e.g. John Doe"
                    required
                    value={formData.fullname}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Mobile Number <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    name="mobileno"
                    placeholder="10-digit mobile number"
                    maxLength="10"
                    required
                    value={formData.mobileno}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    name="emailid"
                    id="emailid"
                    onBlur={checkEmailAvailability}
                    placeholder="name@example.com"
                    required
                    value={formData.emailid}
                    onChange={handleChange}
                  />
                  {emailStatus.text && (
                    <span id="user-availability-status" className="block text-xs font-semibold mt-1" style={{ color: emailStatus.color }}>
                      {emailStatus.text}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Password <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    name="password"
                    placeholder="Min. 8 characters"
                    required
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Confirm Password <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    name="confirmpassword"
                    placeholder="Re-enter password"
                    required
                    value={formData.confirmpassword}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group checkbox flex items-center gap-2 pt-1 text-xs text-slate-600">
                  <input type="checkbox" id="terms_agree" required defaultChecked className="rounded text-brand-red focus:ring-brand-red" />
                  <label htmlFor="terms_agree" className="cursor-pointer">
                    I agree with <a href="/page/terms" className="text-brand-red underline font-medium">Terms and Conditions</a>
                  </label>
                </div>

                <div className="form-group pt-2">
                  <input
                    type="submit"
                    value={loading ? 'Signing Up...' : 'Sign Up'}
                    name="signup"
                    id="submit"
                    className="btn btn-block w-full py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-glow transition-all cursor-pointer"
                    disabled={loading}
                  />
                </div>
              </form>

              {providers?.google && (
                <div className="mt-4">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[11px] font-bold uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="form-group mt-2">
                    <a
                      href="/api/auth/google"
                      className="btn btn-block w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-3 shadow-sm transition-all text-center"
                    >
                      <img src={googleLogo} alt="Google" width="18" height="18" className="inline-block" />
                      <span>Continue with Google</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-slate-50 border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-600">
            <p>
              Already got an account?{' '}
              <a
                href="#loginform"
                data-testid="switch-to-login-from-signup"
                onClick={switchToLogin}
                className="text-brand-red hover:underline font-bold"
              >
                Login here
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
