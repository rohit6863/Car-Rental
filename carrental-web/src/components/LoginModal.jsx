import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import useModalFocusTrap from '../hooks/useModalFocusTrap';
import googleLogo from '../assets/google-logo.svg';

export default function LoginModal() {
  const { login, providers, user } = useAuth();
  const { activeModal, openModal, closeModal } = useModal();
  const isOpen = activeModal === 'login';
  const dialogRef = useRef(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = useCallback(() => {
    closeModal('login');
  }, [closeModal]);

  // Auto-close login modal whenever user becomes authenticated
  useEffect(() => {
    if (user && isOpen) {
      closeModal('login');
    }
  }, [user, isOpen, closeModal]);

  useModalFocusTrap(isOpen, dialogRef, handleClose);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err) {
        if (err === 'cancelled') {
          setError('Google sign-in was cancelled. Please try again.');
        } else if (err === 'email_unverified') {
          setError('Your Google email address is not verified. Please verify your email with Google and try again.');
        } else {
          setError('Google sign-in failed. Please try again.');
        }
        openModal('login');
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [openModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      closeModal('login');
      setEmail('');
      setPassword('');
    } catch (err) {
      if (err.response?.status === 429) {
        const retryHeader = err.response.headers?.['retry-after'];
        const retryAfter = err.response.data?.retryAfter || (retryHeader ? parseInt(retryHeader, 10) : null);
        if (retryAfter) {
          const mins = Math.max(1, Math.ceil(retryAfter / 60));
          setError(`Too many attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
          return;
        }
      }
      const msg = err.response?.data?.error || 'Invalid Details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      className="modal in show fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto"
      id="loginform"
      data-testid="login-modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal-dialog max-w-md w-full mx-auto p-4" role="document">
        <div className="modal-content surface-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-colors">
          
          {/* Header */}
          <div className="modal-header bg-brand-dark text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div>
              <h3 id="login-modal-title" className="modal-title font-display font-extrabold text-lg text-white">Login to Account</h3>
              <p className="text-xs text-slate-400 mt-0.5">Welcome back to WanderWheels</p>
            </div>
            <button
              type="button"
              data-testid="login-modal-close"
              className="close w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              aria-label="Close"
              onClick={handleClose}
            >
              <span aria-hidden="true" className="text-xl leading-none">&times;</span>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body p-6">
            <div className="login_wrap">
              {error && (
                <div className="alert alert-danger mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5 text-rose-500"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    name="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Password <span className="text-brand-red">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                    name="password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="form-group flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input type="checkbox" id="remember" className="rounded text-brand-red focus:ring-brand-red" />
                    <span>Remember me</span>
                  </label>
                  <a
                    href="#forgotpassword"
                    data-testid="switch-to-forgot-link"
                    onClick={(e) => {
                      e.preventDefault();
                      openModal('forgot');
                    }}
                    className="text-brand-red hover:underline font-semibold"
                  >
                    Forgot Password ?
                  </a>
                </div>

                <div className="form-group pt-2">
                  <input
                    type="submit"
                    name="login"
                    value={loading ? 'Logging in...' : 'Login'}
                    className="btn btn-block w-full py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-glow transition-all cursor-pointer"
                    disabled={loading}
                  />
                </div>
              </form>

              {providers?.google && (
                <div className="mt-5">
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[11px] font-bold uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="form-group mt-2">
                    <a
                      href="/api/auth/google"
                      className="btn btn-block w-full py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-3 shadow-sm transition-all text-center"
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
              Don't have an account?{' '}
              <a
                href="#signupform"
                data-testid="switch-to-signup-link"
                onClick={(e) => {
                  e.preventDefault();
                  openModal('signup');
                }}
                className="text-brand-red hover:underline font-bold"
              >
                Signup Here
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
