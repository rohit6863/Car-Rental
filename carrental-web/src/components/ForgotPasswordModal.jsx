import React, { useState } from 'react';
import api from '../api/client';

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

export default function ForgotPasswordModal() {
  const [step, setStep] = useState(1); // 1 = request reset, 2 = enter token & new password
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [token, setToken] = useState('');
  const [newpassword, setNewpassword] = useState('');
  const [confirmpassword, setConfirmpassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      setMsg(res.data.message || 'If this email is registered, you will receive a reset link shortly.');
      if (res.data._devToken) {
        setToken(res.data._devToken);
      }
      setStep(2);
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Email id is invalid');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

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
      const res = await api.post('/api/auth/reset-password', {
        token,
        newpassword,
        confirmpassword,
      });
      setMsg(res.data.message || 'Your Password successfully changed');
      setTimeout(() => {
        if (window.$) {
          window.$('#forgotpassword').modal('hide');
          window.$('#forgotpassword').removeClass('in show').hide();
          window.$('.modal-backdrop').remove();
          window.$('#loginform').modal('show');
        }
        setStep(1);
        setEmail('');
        setToken('');
        setNewpassword('');
        setConfirmpassword('');
      }, 1500);
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (window.$) {
      window.$('#forgotpassword').modal('hide');
    }
  };

  const switchToLogin = (e) => {
    e.preventDefault();
    if (window.$) {
      window.$('#forgotpassword').modal('hide');
      window.$('#loginform').modal('show');
    }
  };

  return (
    <div className="modal fade" id="forgotpassword" tabIndex="-1" role="dialog" aria-hidden="true">
      <div className="modal-dialog max-w-md w-full mx-auto p-4" role="document">
        <div className="modal-content surface-card bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden transition-colors">
          
          {/* Header */}
          <div className="modal-header bg-brand-dark text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
            <div>
              <h3 className="modal-title font-display font-extrabold text-lg text-white">Password Recovery</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {step === 1 ? 'Enter your email to receive recovery instructions' : 'Set your new password'}
              </p>
            </div>
            <button
              type="button"
              className="close w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors focus:outline-none"
              data-dismiss="modal"
              aria-label="Close"
            >
              <span aria-hidden="true" className="text-xl leading-none">&times;</span>
            </button>
          </div>

          {/* Body */}
          <div className="modal-body p-6">
            <div className="forgotpassword_wrap">
              {error && (
                <div className="alert alert-danger mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
                  <i className="fa-solid fa-triangle-exclamation mr-1.5 text-rose-500"></i>
                  {error}
                </div>
              )}
              {msg && (
                <div className="alert alert-success mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold leading-relaxed">
                  <i className="fa-solid fa-circle-check mr-1.5 text-emerald-500"></i>
                  {msg}
                </div>
              )}

              {step === 1 ? (
                <form name="chngpwd" onSubmit={handleRequestReset} className="space-y-4">
                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Email Address <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      className="form-control w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                      placeholder="name@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Registered Mobile (Optional)
                    </label>
                    <input
                      type="text"
                      name="mobile"
                      className="form-control w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                      placeholder="10-digit mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </div>

                  <div className="form-group pt-2">
                    <input
                      type="submit"
                      value={loading ? 'Please wait...' : 'Reset My Password'}
                      name="update"
                      className="btn btn-block w-full py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-glow transition-all cursor-pointer"
                      disabled={loading}
                    />
                  </div>
                </form>
              ) : (
                <form name="chngpwd2" onSubmit={handleResetPassword} className="space-y-4">
                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Reset Token <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="text"
                      name="token"
                      className="form-control w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all font-mono"
                      placeholder="Enter reset token"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      New Password <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="password"
                      name="newpassword"
                      className="form-control w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                      placeholder="Min. 8 characters"
                      required
                      value={newpassword}
                      onChange={(e) => setNewpassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Confirm New Password <span className="text-brand-red">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmpassword"
                      className="form-control w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red focus:bg-white transition-all"
                      placeholder="Re-enter new password"
                      required
                      value={confirmpassword}
                      onChange={(e) => setConfirmpassword(e.target.value)}
                    />
                  </div>

                  <div className="form-group pt-2">
                    <input
                      type="submit"
                      value={loading ? 'Updating...' : 'Set New Password'}
                      name="update"
                      className="btn btn-block w-full py-3.5 px-4 rounded-xl bg-brand-red hover:bg-brand-darkRed text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-glow transition-all cursor-pointer"
                      disabled={loading}
                    />
                  </div>
                </form>
              )}

              <div className="text-center mt-4">
                <p className="text-xs text-slate-500">
                  For security reasons, your password will be securely updated via verified token.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-slate-50 border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-600">
            <a
              href="#loginform"
              data-toggle="modal"
              data-dismiss="modal"
              className="text-brand-red hover:underline font-bold inline-flex items-center gap-1.5"
            >
              <i className="fa-solid fa-angle-left" aria-hidden="true"></i> Back to Login
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
