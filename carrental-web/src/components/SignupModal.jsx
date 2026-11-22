import React, { useState } from 'react';
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

export default function SignupModal() {
  const { register, providers } = useAuth();
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

  const checkEmailAvailability = async () => {
    if (!formData.emailid || !formData.emailid.includes('@')) return;
    try {
      const res = await api.get(`/api/auth/check-email?email=${encodeURIComponent(formData.emailid)}`);
      if (res.data.available) {
        setEmailStatus({ text: 'Email Available for Registration.', color: 'green' });
      } else {
        setEmailStatus({ text: 'Email already exists. Please choose another.', color: 'red' });
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
      setSuccess('Registration successful. Now you are logged in.');
      setTimeout(() => {
        if (window.$) {
          window.$('#signupform').modal('hide');
        }
        setSuccess('');
      }, 1500);
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

  return (
    <div className="modal fade" id="signupform" tabIndex="-1" role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
            <h3 className="modal-title">Sign Up</h3>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="signup_wrap">
                <div className="col-md-12 col-sm-6">
                  {error && <div className="alert alert-danger">{error}</div>}
                  {success && <div className="alert alert-success">{success}</div>}
                  <form method="post" name="signup" onSubmit={handleSubmit}>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="fullname"
                        placeholder="Full Name"
                        required="required"
                        value={formData.fullname}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        className="form-control"
                        name="mobileno"
                        placeholder="Mobile Number"
                        maxLength="10"
                        required="required"
                        value={formData.mobileno}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="email"
                        className="form-control"
                        name="emailid"
                        id="emailid"
                        onBlur={checkEmailAvailability}
                        placeholder="Email Address"
                        required="required"
                        value={formData.emailid}
                        onChange={handleChange}
                      />
                      {emailStatus.text && (
                        <span id="user-availability-status" style={{ fontSize: '12px', color: emailStatus.color }}>
                          {emailStatus.text}
                        </span>
                      )}
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        placeholder="Password"
                        required="required"
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        className="form-control"
                        name="confirmpassword"
                        placeholder="Confirm Password"
                        required="required"
                        value={formData.confirmpassword}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group checkbox">
                      <input type="checkbox" id="terms_agree" required="required" defaultChecked />
                      <label htmlFor="terms_agree">
                        I Agree with <a href="/page/terms">Terms and Conditions</a>
                      </label>
                    </div>
                    <div className="form-group">
                      <input
                        type="submit"
                        value={loading ? 'Signing Up...' : 'Sign Up'}
                        name="signup"
                        id="submit"
                        className="btn btn-block"
                        disabled={loading}
                      />
                    </div>
                  </form>

                  {providers?.google && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
                        <div style={{ flex: 1, borderTop: '1px solid #e4e4e4' }}></div>
                        <span style={{ padding: '0 10px', color: '#888', fontSize: '13px', textTransform: 'uppercase' }}>or</span>
                        <div style={{ flex: 1, borderTop: '1px solid #e4e4e4' }}></div>
                      </div>
                      <div className="form-group">
                        <a
                          href="/api/auth/google"
                          className="btn btn-block"
                          style={{
                            backgroundColor: '#fff',
                            color: '#333',
                            border: '1px solid #ccc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '10px 16px',
                          }}
                        >
                          <img src="/assets/images/google-logo.svg" alt="Google" width="18" height="18" style={{ display: 'inline-block' }} />
                          <span>Continue with Google</span>
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer text-center">
            <p>
              Already got an account?{' '}
              <a href="#loginform" data-toggle="modal" data-dismiss="modal">
                Login Here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
