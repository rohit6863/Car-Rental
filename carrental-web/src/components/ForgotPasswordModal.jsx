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

  return (
    <div className="modal fade" id="forgotpassword" tabIndex="-1" role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
            <h3 className="modal-title">Password Recovery</h3>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="forgotpassword_wrap">
                <div className="col-md-12">
                  {error && <div className="alert alert-danger">{error}</div>}
                  {msg && <div className="alert alert-success">{msg}</div>}

                  {step === 1 ? (
                    <form name="chngpwd" onSubmit={handleRequestReset}>
                      <div className="form-group">
                        <input
                          type="email"
                          name="email"
                          className="form-control"
                          placeholder="Your Email address*"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="text"
                          name="mobile"
                          className="form-control"
                          placeholder="Your Reg. Mobile*"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="submit"
                          value={loading ? 'Please wait...' : 'Reset My Password'}
                          name="update"
                          className="btn btn-block"
                          disabled={loading}
                        />
                      </div>
                    </form>
                  ) : (
                    <form name="chngpwd2" onSubmit={handleResetPassword}>
                      <div className="form-group">
                        <input
                          type="text"
                          name="token"
                          className="form-control"
                          placeholder="Enter Reset Token*"
                          required
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="password"
                          name="newpassword"
                          className="form-control"
                          placeholder="New Password*"
                          required
                          value={newpassword}
                          onChange={(e) => setNewpassword(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="password"
                          name="confirmpassword"
                          className="form-control"
                          placeholder="Confirm Password*"
                          required
                          value={confirmpassword}
                          onChange={(e) => setConfirmpassword(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="submit"
                          value={loading ? 'Updating...' : 'Set New Password'}
                          name="update"
                          className="btn btn-block"
                          disabled={loading}
                        />
                      </div>
                    </form>
                  )}

                  <div className="text-center">
                    <p className="gray_text">
                      For security reasons we don't store your password. Your password will be reset and a new one will be send.
                    </p>
                    <p>
                      <a href="#loginform" data-toggle="modal" data-dismiss="modal">
                        <i className="fa fa-angle-double-left" aria-hidden="true"></i> Back to Login
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
