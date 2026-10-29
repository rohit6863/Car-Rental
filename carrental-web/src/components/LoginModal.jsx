import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
