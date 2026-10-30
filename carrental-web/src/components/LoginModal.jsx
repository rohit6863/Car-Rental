import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { login, providers } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        if (window.$) {
          window.$('#loginform').modal('show');
        }
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Close Bootstrap modal via jQuery
      if (window.$) {
        window.$('#loginform').modal('hide');
      }
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

  return (
    <div className="modal fade" id="loginform" tabIndex="-1" role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
            <h3 className="modal-title">Login</h3>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="login_wrap">
                <div className="col-md-12 col-sm-6">
                  {error && <div className="alert alert-danger" style={{ marginBottom: '15px' }}>{error}</div>}
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        placeholder="Email address*"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="password"
                        className="form-control"
                        name="password"
                        placeholder="Password*"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="form-group checkbox">
                      <input type="checkbox" id="remember" />
                    </div>
                    <div className="form-group">
                      <input
                        type="submit"
                        name="login"
                        value={loading ? 'Logging in...' : 'Login'}
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
              Don't have an account?{' '}
              <a href="#signupform" data-toggle="modal" data-dismiss="modal">
                Signup Here
              </a>
            </p>
            <p>
              <a href="#forgotpassword" data-toggle="modal" data-dismiss="modal">
                Forgot Password ?
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
